function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-route" aria-hidden="true" />
      <div className="auth-decoration auth-decoration-burst" aria-hidden="true" />
      <div className="auth-decoration auth-decoration-disc" aria-hidden="true" />
      {children}
    </main>
  )
}

export default AuthLayout
