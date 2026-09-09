import React, { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  ListTodo,
  MapPin,
  Plus,
  RefreshCw,
  UserRound,
  Wrench,
} from 'lucide-react'

const STATUS_ORDER = ['scheduled', 'in_progress', 'completed']

function statusLabel(status) {
  if (status === 'in_progress') return 'In progress'
  if (status === 'completed') return 'Completed'
  return 'Scheduled'
}

function formatProgress(job) {
  const checklist = Array.isArray(job.checklist) ? job.checklist : []
  if (!checklist.length) return 'No checklist'
  const done = checklist.filter(item => item.completed).length
  return `${done}/${checklist.length}`
}

export default function TasksView({
  taskEvents = [],
  jobs = [],
  templates = [],
  currentCiriloId = '',
  onOpenTask,
  onNewTask,
  onNewJob,
  onOpenJob,
  onOpenTemplates,
  onCreateFromTemplate,
}) {
  const [tab, setTab] = useState('tasks')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      const aKey = `${a.date || ''} ${a.startTime || ''}`
      const bKey = `${b.date || ''} ${b.startTime || ''}`
      return aKey.localeCompare(bKey)
    })
    if (statusFilter === 'all') return sorted
    return sorted.filter(job => job.status === statusFilter)
  }, [jobs, statusFilter])

  const counts = useMemo(() => {
    return jobs.reduce(
      (acc, job) => {
        acc.all += 1
        if (job.status === 'scheduled') acc.scheduled += 1
        if (job.status === 'in_progress') acc.in_progress += 1
        if (job.status === 'completed') acc.completed += 1
        return acc
      },
      { all: 0, scheduled: 0, in_progress: 0, completed: 0 }
    )
  }, [jobs])

  return (
    <section className="tasks-tamba-view">
      <div className="tasks-tamba-intro">
        <div>
          <span className="eyebrow">Tasks & Tamba</span>
          <h2>Plan it. Assign it. Get it done.</h2>
          <p>
            Keep personal tasks simple, and use Tamba Field Work for structured jobs,
            checklists and assigned work in the real world.
          </p>
        </div>
        <div className="tasks-tamba-top-actions">
          {tab === 'tasks' ? (
            <button className="primary-btn" onClick={onNewTask}>
              <Plus size={16} /> New task
            </button>
          ) : (
            <>
              <button className="secondary-btn" onClick={onOpenTemplates}>
                <FileCheck2 size={15} /> Templates
              </button>
              <button className="primary-btn" onClick={() => onNewJob()}>
                <Plus size={16} /> New job
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tasks-tamba-tabs" role="tablist" aria-label="Tasks and Tamba">
        <button
          className={tab === 'tasks' ? 'active' : ''}
          onClick={() => setTab('tasks')}
          type="button"
        >
          <ListTodo size={15} />
          Tasks
        </button>
        <button
          className={tab === 'tamba' ? 'active' : ''}
          onClick={() => setTab('tamba')}
          type="button"
        >
          <Wrench size={15} />
          Tamba Field Work
        </button>
      </div>

      {tab === 'tasks' && (
        <div className="tasks-tamba-panel">
          <div className="tasks-tamba-panel-head">
            <div>
              <strong>Tasks</strong>
              <small>{taskEvents.length} open or upcoming</small>
            </div>
          </div>

          <div className="task-list">
            {taskEvents.length === 0 ? (
              <div className="tasks-tamba-empty">
                <ListTodo size={22} />
                <p>No tasks yet.</p>
                <button className="secondary-btn compact" onClick={onNewTask}>
                  Add your first task
                </button>
              </div>
            ) : (
              taskEvents.map(task => (
                <button
                  key={task.id}
                  className="task-row"
                  onClick={() => onOpenTask(task)}
                  type="button"
                >
                  <i style={{ background: '#7E8793' }} />
                  <span>
                    <span>{task.title}</span>
                    <small>
                      {task.date} · {task.startTime}
                    </small>
                  </span>
                  <span>{task.completed ? 'Done' : 'Open'}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'tamba' && (
        <>
          <div className="tamba-status-filters">
            {[
              ['all', 'All'],
              ...STATUS_ORDER.map(status => [status, statusLabel(status)]),
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={statusFilter === key ? 'active' : ''}
                onClick={() => setStatusFilter(key)}
              >
                {label}
                <span>{counts[key] || 0}</span>
              </button>
            ))}
          </div>

          {templates.length > 0 && (
            <div className="tamba-template-strip">
              <div className="tamba-template-strip-head">
                <span>Quick start from a template</span>
                <button type="button" onClick={onOpenTemplates}>
                  Manage templates
                  <ChevronRight size={13} />
                </button>
              </div>
              <div className="tamba-template-chips">
                {templates.slice(0, 5).map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onCreateFromTemplate(template)}
                  >
                    <FileCheck2 size={13} />
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="tamba-job-list">
            {filteredJobs.length === 0 ? (
              <div className="tasks-tamba-empty">
                <Wrench size={22} />
                <p>No Tamba jobs in this view.</p>
                <button className="primary-btn compact" onClick={() => onNewJob()}>
                  Create a job
                </button>
              </div>
            ) : (
              filteredJobs.map(job => {
                const assignedTo =
                  job.assignedToCiriloId ||
                  (job.assignedToUid ? 'Cirilo member' : 'Unassigned')

                return (
                  <button
                    key={job.id}
                    className={`tamba-job-row status-${job.status || 'scheduled'}`}
                    onClick={() => onOpenJob(job)}
                    type="button"
                  >
                    <span className="tamba-status-mark">
                      {job.status === 'completed' ? (
                        <CheckCircle2 size={17} />
                      ) : job.status === 'in_progress' ? (
                        <RefreshCw size={16} />
                      ) : (
                        <Clock3 size={16} />
                      )}
                    </span>

                    <span className="tamba-job-main">
                      <strong>{job.title || 'Untitled job'}</strong>
                      <small>
                        <span>
                          <Clock3 size={11} />
                          {job.date || 'No date'} · {job.startTime || '--:--'}–
                          {job.endTime || '--:--'}
                        </span>
                        {job.location && (
                          <span>
                            <MapPin size={11} />
                            {job.location}
                          </span>
                        )}
                      </small>
                    </span>

                    <span className="tamba-job-assignee">
                      <UserRound size={13} />
                      <span>
                        <small>Assigned to</small>
                        <strong>
                          {assignedTo === currentCiriloId ? 'You' : assignedTo}
                        </strong>
                      </span>
                    </span>

                    <span className="tamba-job-progress">
                      <small>Checklist</small>
                      <strong>{formatProgress(job)}</strong>
                    </span>

                    <span className={`tamba-status-pill ${job.status || 'scheduled'}`}>
                      {statusLabel(job.status)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </section>
  )
}
