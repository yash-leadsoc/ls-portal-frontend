import './DeveloperCard.css';
import {
  FaEnvelope,
  FaLinkedinIn,
  FaInstagram,
} from 'react-icons/fa';

export default function DeveloperCard({ developer }) {
  return (
    <div className="developer-card">

      <div className="developer-card-top">
        <div className="developer-brand">
          <span className="developer-brand-icon">✦</span>
          <span>LeadSoC Portal</span>
        </div>

        <div className="developer-label">
          DEVELOPER
        </div>
      </div>

      <div className="developer-card-body">
        <div className="developer-photo-wrapper">
          <img
            src={developer.photo}
            alt={developer.name}
            className="developer-photo"
          />
        </div>

        <div className="developer-info">
          <div className="developer-name">
            {developer.name}
          </div>

          <div className="developer-role">
            {developer.role}
          </div>

          <div className="developer-lsid">
            LSID · {developer.lsid}
          </div>
        </div>
      </div>

      <div className="developer-socials">

        <a
          href={`mailto:${developer.email}`}
          className="developer-social gmail"
          title="Email"
          aria-label="Email"
        >
          <FaEnvelope />
        </a>

        <a
          href={developer.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="developer-social linkedin"
          title="LinkedIn"
          aria-label="LinkedIn"
        >
          <FaLinkedinIn />
        </a>

        <a
          href={developer.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="developer-social instagram"
          title="Instagram"
          aria-label="Instagram"
        >
          <FaInstagram />
        </a>

      </div>

      <div className="developer-card-footer">
        Built with dedication at LeadSoC
      </div>

    </div>
  );
}
