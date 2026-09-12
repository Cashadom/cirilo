import React from 'react'
import {
  BriefcaseBusiness,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'

const STATUS_LABELS = {
  new: 'New',
  interview: 'Interview',
  pending: 'Pending',
  hired: 'Hired',
  rejected: 'Rejected',
}

export default function TalentCard({
  talent,
  onOpen,
}) {
  const fullName =
    [talent.firstName, talent.lastName]
      .filter(Boolean)
      .join(' ') || 'Unnamed talent'

  const initials =
    `${talent.firstName?.[0] || ''}${talent.lastName?.[0] || ''}`
      .toUpperCase() || 'T'

  return (
    <button
      type="button"
      className="talent-card"
      onClick={() => onOpen(talent)}
    >
      <div className="talent-card-head">
        <span className="talent-avatar">
          {initials}
        </span>

        <div className="talent-card-name">
          <strong>{fullName}</strong>

          <span>
            <BriefcaseBusiness size={13} />
            {talent.jobTitle || 'Candidate'}
          </span>
        </div>

        <span
          className={`talent-status talent-status-${talent.status || 'new'}`}
        >
          {STATUS_LABELS[talent.status] || 'New'}
        </span>
      </div>

      <div className="talent-card-meta">
        {talent.location && (
          <span>
            <MapPin size={13} />
            {talent.location}
          </span>
        )}

        {talent.email && (
          <span>
            <Mail size={13} />
            {talent.email}
          </span>
        )}

        {talent.phone && (
          <span>
            <Phone size={13} />
            {talent.phone}
          </span>
        )}
      </div>
    </button>
  )
}
