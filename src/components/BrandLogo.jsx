import paraLogo from '../assets/PARA.png'

export default function BrandLogo({ compact = false }) {
  return (
    <span className="para-logo" aria-label="PARA Webtool">
      <img className="para-logo-mark" src={paraLogo} width="40" height="40" alt="PARA" />
      {!compact && (
        <span className="para-logo-wordmark" aria-hidden="true">
          PARA<span>WEBTOOL</span>
        </span>
      )}
    </span>
  )
}
