import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Search,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  deleteTalent,
  saveTalent,
  subscribeToTalents,
} from '../services/talentService'
import TalentCard from './TalentCard'
import TalentModal from './TalentModal'

const FILTERS = [
  ['all', 'All'],
  ['interview', 'Interview'],
  ['pending', 'Pending'],
  ['hired', 'Hired'],
  ['rejected', 'Rejected'],
]

export default function TalentsView({
  createSignal = 0,
  onAddInterview,
  onCreateNote,
}) {
  const { firebaseUser, profile } = useAuth()
  const [talents, setTalents] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseUser) return undefined

    return subscribeToTalents(
      firebaseUser.uid,
      setTalents,
      (err) => {
        console.error(err)
        setError(
          err?.message ||
            'Could not load Talents.'
        )
      }
    )
  }, [firebaseUser])

  useEffect(() => {
    if (!createSignal) return
    setEditing(null)
    setModalOpen(true)
  }, [createSignal])

  const counts = useMemo(() => {
    const next = {
      all: talents.length,
      interview: 0,
      pending: 0,
      hired: 0,
      rejected: 0,
    }

    talents.forEach((talent) => {

      if (next[talent.status] !== undefined) {
        next[talent.status] += 1
      }
    })

    return next
  }, [talents])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return talents.filter((talent) => {
      const filterMatch =
        filter === 'all' ||
        talent.status === filter

      if (!filterMatch) return false
      if (!needle) return true

      const haystack = [
        talent.firstName,
        talent.lastName,
        talent.jobTitle,
        talent.location,
        talent.email,
        talent.phone,
        talent.source,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(needle)
    })
  }, [talents, filter, search])

  async function handleSave(talent) {
    const saved = await saveTalent({
      uid: firebaseUser.uid,
      ciriloId: profile?.ciriloId || '',
      talent,
    })

    return saved
  }

  async function handleDelete(talentId) {
    if (
      !window.confirm(
        'Delete this talent profile?'
      )
    ) {
      return
    }

    await deleteTalent(
      firebaseUser.uid,
      talentId
    )

    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="talents-view">
      <div className="talents-tools">
        <div className="talent-filter-strip">
          {FILTERS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={
                filter === key ? 'active' : ''
              }
              onClick={() => setFilter(key)}
            >
              {label}
              <span>{counts[key] || 0}</span>
            </button>
          ))}
        </div>

        <label className="talent-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search talents..."
          />
        </label>
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {visible.length ? (
        <div className="talent-grid">
          {visible.map((talent) => (
            <TalentCard
              key={talent.id}
              talent={talent}
              onOpen={(selected) => {
                setEditing(selected)
                setModalOpen(true)
              }}
            />
          ))}
        </div>
      ) : (
        <div className="tasks-tamba-empty talent-empty">
          <UsersRound size={24} />
          <p>
            {talents.length
              ? 'No talent matches this view.'
              : 'No talent yet.'}
          </p>

          {!talents.length && (
            <button
              type="button"
              className="secondary-btn compact"
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <UserPlus size={14} />
              Add your first talent
            </button>
          )}
        </div>
      )}

      <TalentModal
        open={modalOpen}
        talent={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSave={handleSave}
        onDelete={handleDelete}
        onAddInterview={(talent) => {
          onAddInterview?.(talent)
          setModalOpen(false)
        }}
        onCreateNote={async (talent) => {
          await onCreateNote?.(talent)
          setModalOpen(false)
        }}
      />
    </div>
  )
}
