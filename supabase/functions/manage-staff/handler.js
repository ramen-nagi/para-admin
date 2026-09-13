const roles = ['admin', 'editor', 'operator']
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function deliveryError(error) {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit')
    return reply(429, { error: 'Too many email requests. Please wait before trying again.' })
  if (error.code === 'email_exists' || error.code === 'user_already_exists')
    return reply(409, {
      error:
        'This email already has an account. Find it in the directory and choose Manage access.',
    })
  return reply(502, {
    error: 'Email could not be sent. Check the project email configuration or try again later.',
  })
}

// Clients are injected so authorization and email side effects can be tested without real users.
export function createHandler({ createUserClient, createAdminClient, appUrl }) {
  return async function handle(request) {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: corsHeaders })
    if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' })
    const authorization = request.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Sign in to continue.' })

    try {
      const userClient = createUserClient(authorization)
      const { data: identity, error: identityError } = await userClient.auth.getUser()
      if (identityError || !identity?.user)
        return reply(401, { error: 'Your session has expired. Sign in again.' })
      const { data: role, error: roleError } = await userClient.rpc('current_staff_role')
      if (roleError) return reply(503, { error: 'Unable to verify staff access. Try again.' })
      if (role !== 'admin') return reply(403, { error: 'Administrator access required.' })

      let body
      try {
        body = await request.json()
      } catch {
        return reply(400, { error: 'Invalid request.' })
      }
      if (
        !body ||
        !['create_user', 'invite', 'resend_invite', 'reset_password'].includes(body.action)
      )
        return reply(400, { error: 'Choose a valid account action.' })
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
        return reply(400, { error: 'Enter a valid email address.' })
      if (body.action === 'invite' && !roles.includes(body.role))
        return reply(400, { error: 'Choose a valid staff role.' })
      if (body.action === 'create_user') {
        if (!['passenger', ...roles].includes(body.role))
          return reply(400, { error: 'Choose a valid user role.' })
        if (
          typeof body.password !== 'string' ||
          body.password.length < 12 ||
          new TextEncoder().encode(body.password).length > 72
        )
          return reply(400, {
            error: 'Use a password with at least 12 characters and at most 72 bytes.',
          })
        const adminClient = createAdminClient()
        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password: body.password,
          email_confirm: true,
        })
        if (error) {
          if (['email_exists', 'user_already_exists'].includes(error.code))
            return reply(409, {
              error:
                'This email already has an account. Find it in the directory to manage access.',
            })
          if (error.code === 'weak_password')
            return reply(400, {
              error:
                'The password does not meet the project password requirements. Choose a stronger password.',
            })
          return reply(502, {
            error: 'The account could not be created. Refresh the directory before retrying.',
          })
        }
        if (!data?.user?.id)
          return reply(502, {
            error: 'No account was returned. Refresh the directory before retrying.',
          })
        if (body.role !== 'passenger') {
          const { error: accessError } = await userClient.rpc('set_managed_user_access', {
            p_user_id: data.user.id,
            p_role: body.role,
            p_is_active: true,
          })
          if (accessError)
            return reply(200, {
              warning:
                'Account created as a passenger, but staff access could not be assigned. Find the account in the directory and edit its access.',
              userId: data.user.id,
              accessAssigned: false,
            })
        }
        return reply(200, {
          message: 'Account created. No email was sent.',
          userId: data.user.id,
          accessAssigned: true,
        })
      }
      if (!appUrl)
        return reply(503, {
          error:
            'Email setup is incomplete. Configure the staff application URL before sending emails.',
        })
      const redirect = new URL(appUrl)
      if (
        redirect.protocol !== 'https:' &&
        !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname))
      )
        return reply(503, { error: 'The staff application URL is invalid.' })
      redirect.search = '?account=password'
      redirect.hash = ''

      const { data: accounts, error: accountsError } = await userClient.rpc(
        'list_staff_account_details',
      )
      if (accountsError)
        return reply(503, { error: 'Unable to verify the target account. Try again.' })
      const target = accounts?.find((account) => account.email?.toLowerCase() === email)
      if (body.action === 'invite' && target)
        return reply(409, {
          error: 'This staff account already exists. Use its account actions instead.',
        })
      if (body.action !== 'invite' && (!target || !target.is_active))
        return reply(403, { error: 'Choose an active staff account.' })
      if (body.action === 'resend_invite' && target.email_confirmed_at)
        return reply(409, {
          error: 'This account is already confirmed. Send a password reset instead.',
        })

      // The service key never leaves the server. It is created only after authorization.
      const adminClient = createAdminClient()
      if (body.action === 'reset_password') {
        const { error } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo: redirect.href,
        })
        return error ? deliveryError(error) : reply(200, { message: 'Password-reset email sent.' })
      }
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirect.href,
      })
      if (error) return deliveryError(error)
      if (!data?.user?.id)
        return reply(502, {
          error:
            'The invitation service did not return an account. Refresh and check before retrying.',
        })
      if (body.action === 'invite') {
        // Use the caller's guarded RPC: role assignment rechecks live admin access.
        const { error: accessError } = await userClient.rpc('set_staff_access', {
          p_email: email,
          p_role: body.role,
          p_is_active: true,
        })
        if (accessError)
          return reply(200, {
            warning:
              'Invitation sent, but staff access was not assigned. Find this email in the directory and choose Manage access to finish setup.',
            accessAssigned: false,
          })
      }
      return reply(200, {
        message:
          body.action === 'invite'
            ? 'Invitation sent and staff role assigned.'
            : 'Invitation sent again.',
        accessAssigned: true,
      })
    } catch {
      return reply(503, {
        error: 'The request could not be completed. Refresh the account list before retrying.',
      })
    }
  }
}
