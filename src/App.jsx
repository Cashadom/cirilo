import React,{useEffect,useMemo,useState} from 'react'
import { addDays,addWeeks,format,subWeeks } from 'date-fns'
import { Archive,BookOpenText,CalendarDays,ChevronLeft,ChevronRight,Compass,Inbox,ListTodo,LogOut,Plus,UserRound,WalletCards } from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import InboxView from './components/InboxView'
import SharedCardPage from './components/SharedCardPage'
import WeekView from './components/WeekView'
import WeekSummary from './components/WeekSummary'
import ShareEventDialog from './components/ShareEventDialog'
import EventModal from './components/EventModal'
import QuickAdd from './components/QuickAdd'
import DiscoverView from './components/DiscoverView'
import PublicEventPage from './components/PublicEventPage'
import ArchiveView from './components/ArchiveView'
import PlansView from './components/PlansView'
import NotesView from './components/NotesView'
import TasksView from './components/TasksView'
import TambaJobModal from './components/TambaJobModal'
import TambaTemplateModal from './components/TambaTemplateModal'
import NoteShareDialog from './components/NoteShareDialog'
import SharedNotePage from './components/SharedNotePage'
import ProfileView from './components/ProfileView'
import PublicProfilePage from './components/PublicProfilePage'
import SeoMeta from './components/SeoMeta'
import { PUBLIC_EVENTS } from './data/publicEvents'
import { useCalendar } from './context/CalendarContext'
import { useAuth } from './context/AuthContext'
import { CATEGORIES,dateKey,getWeekDays,minutesFromTime } from './utils/calendar'
import { createEmailSharesMany, openEmailClientForShares, shareEventToCiriloMany } from './services/shareService'
import { markNoteItemScheduled, saveNote, syncDueNoteReminders } from './services/notesService'
import { openBillingPortal, startProCheckout } from './services/stripeService'
import { acceptTambaInboxJob, archiveTambaJob, deleteTambaJob, deleteTambaTemplate, makeJobFromTemplate, saveTambaJob, saveTambaTemplate, subscribeToTambaJobs, subscribeToTambaTemplates, updateTambaJobStatus, uploadTambaProofPhoto } from './services/tambaService'

export default function App(){
  const {firebaseUser,profile:authProfile,loading:authLoading,logout,refreshProfile}=useAuth()
  const {events,addEvent,updateEvent,deleteEvent,resetDemo}=useCalendar()
  const [anchor,setAnchor]=useState(new Date()),[activeCats,setActiveCats]=useState(new Set(Object.keys(CATEGORIES))),[modalOpen,setModalOpen]=useState(false),[draft,setDraft]=useState(null),[readOnly,setReadOnly]=useState(false),[view,setView]=useState(()=>new URLSearchParams(window.location.search).get('view')||'week'),[publicOpen,setPublicOpen]=useState(null),[shareOpen,setShareOpen]=useState(null),[publicProfileOpen,setPublicProfileOpen]=useState(false),[sharedToken,setSharedToken]=useState(()=>new URLSearchParams(window.location.search).get('share')),[noteShareOpen,setNoteShareOpen]=useState(null),[sharedNoteToken,setSharedNoteToken]=useState(()=>new URLSearchParams(window.location.search).get('sharedNote')),[focusNoteId,setFocusNoteId]=useState(''),[focusNoteItemId,setFocusNoteItemId]=useState(''),[noteRecipientPrefill,setNoteRecipientPrefill]=useState(''),[tambaJobs,setTambaJobs]=useState([]),[tambaTemplates,setTambaTemplates]=useState([]),[tambaJobOpen,setTambaJobOpen]=useState(false),[tambaJobDraft,setTambaJobDraft]=useState(null),[tambaTemplateOpen,setTambaTemplateOpen]=useState(false)

  const profile=useMemo(()=>({
    id:firebaseUser?.uid||'me',
    uid:firebaseUser?.uid||'',
    name:authProfile?.displayName||firebaseUser?.displayName||'Cirilo user',
    displayName:authProfile?.displayName||firebaseUser?.displayName||'Cirilo user',
    role:authProfile?.role||'Member',
    location:authProfile?.location||'',
    slug:authProfile?.slug||authProfile?.ciriloId||'',
    bio:authProfile?.bio||'',
    ciriloId:authProfile?.ciriloId||'',
    photoURL:authProfile?.photoURL||firebaseUser?.photoURL||'',
  }),[authProfile,firebaseUser])
  const plan=authProfile?.plan||'free', canPublishPublic=plan==='pro'||plan==='business', today=dateKey(new Date()), days=useMemo(()=>getWeekDays(anchor),[anchor]), weekKeys=useMemo(()=>new Set(days.map(dateKey)),[days]), liveEvents=useMemo(()=>events.filter(e=>e.date>=today),[events,today]), archivedEvents=useMemo(()=>events.filter(e=>e.date<today).sort((a,b)=>b.date.localeCompare(a.date)),[events,today]), weekEvents=useMemo(()=>liveEvents.filter(e=>weekKeys.has(e.date)),[liveEvents,weekKeys])
  const discoveryEvents=useMemo(()=>{const base=days[0];return PUBLIC_EVENTS.map(item=>{const date=addDays(base,item.dateOffset);return {...item,date:dateKey(date),displayDate:format(date,'EEEE, MMMM d')}})},[days])
  const myPublicEvents=useMemo(()=>events.filter(e=>e.visibility==='public'&&e.date>=today).map(e=>({...e,publicId:e.publicId||`public-${e.id}`,displayDate:format(new Date(`${e.date}T12:00:00`),'EEEE, MMMM d'),owner:{id:profile.id,name:profile.name,role:profile.role},joined:e.joined||0,capacity:e.capacity||null})),[events,profile,today])

  useEffect(()=>{const params=new URLSearchParams(window.location.search),publicId=params.get('public');if(!publicId)return;const match=[...discoveryEvents,...myPublicEvents].find(e=>e.publicId===publicId);if(match){setView('discover');setPublicOpen(match)}},[discoveryEvents,myPublicEvents])
  useEffect(()=>{const url=new URL(window.location.href);url.searchParams.delete('view');if(['discover','archive','profile','plans','tasks','inbox','notes'].includes(view))url.searchParams.set('view',view);history.replaceState({},'',url)},[view])
  useEffect(()=>{
    if(!firebaseUser||sharedToken)return
    const pending=localStorage.getItem('cirilo.pendingShareToken')
    if(pending){
      localStorage.removeItem('cirilo.pendingShareToken')
      setSharedToken(pending)
    }
  },[firebaseUser,sharedToken])
  useEffect(()=>{
    if(!firebaseUser)return
    syncDueNoteReminders(firebaseUser.uid).catch(error=>console.error('Could not sync note reminders:',error))
  },[firebaseUser])
  useEffect(()=>{
    if(!firebaseUser)return
    const stopJobs=subscribeToTambaJobs(
      firebaseUser.uid,
      setTambaJobs,
      error=>console.error('Could not load Tamba jobs:',error)
    )
    const stopTemplates=subscribeToTambaTemplates(
      firebaseUser.uid,
      setTambaTemplates,
      error=>console.error('Could not load Tamba templates:',error)
    )
    return()=>{
      stopJobs?.()
      stopTemplates?.()
    }
  },[firebaseUser])
  useEffect(()=>{
    if(!firebaseUser)return

    const params=new URLSearchParams(window.location.search)
    const stripeState=params.get('stripe')

    if(stripeState==='success'){
      const refresh=async()=>{
        // Webhook may arrive a fraction of a second after Checkout returns.
        for(let attempt=0;attempt<6;attempt+=1){
          await refreshProfile?.()
          await new Promise(resolve=>setTimeout(resolve,1200))
        }

        const url=new URL(window.location.href)
        url.searchParams.delete('stripe')
        url.searchParams.delete('session_id')
        window.history.replaceState({},'',url)
      }

      refresh().catch(error=>console.error('Could not refresh Stripe plan:',error))
    }

    if(stripeState==='cancelled'){
      const url=new URL(window.location.href)
      url.searchParams.delete('stripe')
      window.history.replaceState({},'',url)
    }
  },[firebaseUser,refreshProfile])

  const openNew=(prefill={})=>{const requestedDate=prefill.date||dateKey(days[0]);const safeDate=requestedDate<today?today:requestedDate;setReadOnly(false);setDraft({title:'',category:'pro',type:'event',startTime:'09:00',endTime:'10:00',location:'',people:'',notes:'',reminder:'15 min before',priority:'normal',completed:false,visibility:'private',...prefill,date:safeDate});setModalOpen(true)}
  const proposeEventToContact=ciriloId=>{
    if(!ciriloId)return
    openNew({
      visibility:'shared',
      invitedCiriloIds:[ciriloId],
    })
  }
  const sendNoteToContact=ciriloId=>{
    if(!ciriloId)return
    setNoteRecipientPrefill(ciriloId)
    setView('notes')
  }
  const openTambaJob=(job=null)=>{
    setTambaJobDraft(job)
    setTambaJobOpen(true)
  }
  const createTambaFromTemplate=template=>{
    setTambaTemplateOpen(false)
    setTambaJobDraft(makeJobFromTemplate(template,today))
    setTambaJobOpen(true)
  }
  const saveCurrentTambaJob=async job=>{
    const savedJob=await saveTambaJob({
      ownerUid:firebaseUser.uid,
      ownerCiriloId:authProfile?.ciriloId||'',
      job,
    })

    setTambaJobs(current=>{
      const exists=current.some(item=>item.id===savedJob.id)

      if(exists){
        return current.map(item=>
          item.id===savedJob.id
            ? {...item,...savedJob}
            : item
        )
      }

      return [savedJob,...current]
    })

    return savedJob
  }

  const addTambaToMyAgenda=async job=>{
    const sourceId=job.id||crypto.randomUUID()
    const existing=events.find(event=>event.sourceTambaJobId===sourceId)

    const eventPayload={
      id:existing?.id||crypto.randomUUID(),
      title:job.title||'Tamba Field Work',
      category:'tasks',
      type:'event',
      date:job.date||today,
      startTime:job.startTime||'09:00',
      endTime:job.endTime||'10:00',
      location:job.location||'',
      people:job.assignedToCiriloId||'',
      notes:[
        job.client?`Client / place: ${job.client}`:'',
        job.notes||'',
        ...(job.checklist||[]).map(item=>`• ${item.text||''}`),
      ].filter(Boolean).join('\n'),
      reminder:'15 min before',
      priority:'normal',
      completed:false,
      visibility:'private',
      createdByUid:firebaseUser.uid,
      createdByCiriloId:authProfile?.ciriloId||'',
      sourceTambaJobId:sourceId,
    }

    if(existing){
      await updateEvent(eventPayload)
    }else{
      await addEvent(eventPayload)
    }
  }

  const archiveCurrentTambaJob=async job=>{
    await archiveTambaJob(firebaseUser.uid,job)

    setTambaJobs(current=>
      current.map(item=>
        item.id===job.id
          ? {...item,archived:true}
          : item
      )
    )
  }
  const addInboxTambaToWorkspace=async inboxItem=>{
    await acceptTambaInboxJob({
      uid:firebaseUser.uid,
      ciriloId:authProfile?.ciriloId||'',
      inboxItem,
    })
    setView('tasks')
  }

  const updateCurrentTambaStatus=async(job,status)=>{
    await updateTambaJobStatus({
      currentUid:firebaseUser.uid,
      job,
      status,
    })
  }
  const openEdit=event=>{
    if(event?.type==='tamba_job'&&event?.tambaJobId){
      const job=tambaJobs.find(item=>item.id===event.tambaJobId)
      if(job){openTambaJob(job);return}
    }
    if(event.sourceNoteId){setFocusNoteId(event.sourceNoteId);setFocusNoteItemId(event.sourceNoteItemId||'');setView('notes');return}setReadOnly(false);setDraft(event);setModalOpen(true)
  },openArchive=event=>{setReadOnly(true);setDraft(event);setModalOpen(true)}
  const noteToWeek=({noteId,noteTitle,universe,item})=>{
    const category=
      universe==='pro'?'pro':
      universe==='study'?'tasks':
      universe==='health'?'personal':
      'personal'

    openNew({
      title:item?.text||noteTitle||'Saved note',
      category,
      type:'event',
      notes:`From Notes · ${noteTitle||''}`,
      visibility:'private',
      sourceNoteId:noteId,
      sourceNoteItemId:item?.id||'',
      sourceNoteTitle:noteTitle||'',
    })
  }
  const noteToEvent=({noteId,noteTitle,universe,items=[]})=>{
    const category=
      universe==='pro'?'pro':
      universe==='study'?'tasks':
      universe==='health'?'personal':
      'personal'

    const noteBody=(items||[])
      .map(item=>String(item?.text||'').trim())
      .filter(Boolean)
      .join('\n')

    openNew({
      title:noteTitle||'Saved note',
      category,
      type:'event',
      notes:noteBody,
      visibility:'private',
      sourceNoteId:noteId,
      sourceNoteItemId:'',
      sourceNoteTitle:noteTitle||'',
    })
  }
  const addPublicToWeek=async event=>{
    if(!event)return


    const sourcePublicId=event.publicId||event.id||`discover-${String(event.title||'event').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${event.date||today}`
    const safeCategory=CATEGORIES[event.category]?event.category:'personal'
    const requestedDate=event.date||today
    const safeDate=requestedDate<today?today:requestedDate

    try{
      const existing=events.find(item=>item.sourcePublicId===sourcePublicId)

      const payload={
        id:existing?.id||crypto.randomUUID(),
        title:event.title||existing?.title||'Public event',
        category:safeCategory,
        type:'event',
        date:safeDate,
        startTime:event.startTime||existing?.startTime||'09:00',
        endTime:event.endTime||existing?.endTime||'10:00',
        location:event.location||existing?.location||'',
        people:'',
        notes:event.notes||event.description||existing?.notes||'',
        reminder:event.reminder||existing?.reminder||'30 min before',
        priority:'normal',
        completed:false,
        visibility:'private',
        sharedBy:event.owner?.name||event.ownerName||event.host||existing?.sharedBy||'Cirilo',
        sourcePublicId,
        createdByUid:firebaseUser.uid,
        createdByCiriloId:authProfile?.ciriloId||'',
      }

      if(existing){
        await updateEvent(payload)
      }else{
        await addEvent(payload)
      }

      setActiveCats(current=>{
        const next=new Set(current)
        next.add(safeCategory)
        return next
      })

      setPublicOpen(null)
      setAnchor(new Date(`${safeDate}T12:00:00`))
      setView('week')
    }catch(error){
      console.error('Could not add Discover event to Week:',error)
      window.alert(`Could not add this event to your Week: ${error?.message||'Unknown error'}`)
    }
  }

  const talentToWeek=(talent)=>{
    const fullName=[talent?.firstName,talent?.lastName]
      .filter(Boolean)
      .join(' ')||'Candidate'

    setView('week')

    openNew({
      title:`Interview — ${fullName}`,
      category:'pro',
      type:'event',
      people:fullName,
      location:talent?.location||'',
      notes:[
        talent?.jobTitle?`Role: ${talent.jobTitle}`:'',
        talent?.phone?`Phone: ${talent.phone}`:'',
        talent?.email?`Email: ${talent.email}`:'',
      ].filter(Boolean).join('\n'),
      visibility:'private',
      sourceTalentId:talent?.id||'',
      sourceTalentName:fullName,
    })
  }

  const talentToNote=async(talent)=>{
    const fullName=[talent?.firstName,talent?.lastName]
      .filter(Boolean)
      .join(' ')||'Candidate'

    await saveNote(firebaseUser.uid,{
      title:`Interview report — ${fullName}`,
      universe:'pro',
      visibility:'private',
      sharePolicy:'private',
      ownerUid:firebaseUser.uid,
      ownerCiriloId:authProfile?.ciriloId||'',
      localOwnerUid:firebaseUser.uid,
      items:[{
        id:crypto.randomUUID(),
        kind:'text',
        text:[
          `Talent: ${fullName}`,
          talent?.jobTitle?`Role: ${talent.jobTitle}`:'',
          talent?.location?`Location: ${talent.location}`:'',
          talent?.phone?`Phone: ${talent.phone}`:'',
          talent?.email?`Email: ${talent.email}`:'',
            '',
          'Interview notes:',
        ].filter(value=>value!==null&&value!==undefined).join('\n'),
        status:'active',
      }],
    })

    setView('notes')
  }


  useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('.quick-add input')?.focus()}};addEventListener('keydown',h);return()=>removeEventListener('keydown',h)},[])
  const toggleCategory=key=>setActiveCats(prev=>{const next=new Set(prev);next.has(key)?next.delete(key):next.add(key);return next})
  const resize=(id,delta)=>{const event=events.find(e=>e.id===id);if(!event)return;const end=minutesFromTime(event.endTime)+delta;updateEvent({id,endTime:`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`})}
  const taskEvents=liveEvents.filter(e=>e.type==='task')
  const activeTambaJobs=useMemo(
    ()=>tambaJobs.filter(job=>!job.archived),
    [tambaJobs]
  )
  const archivedTambaJobs=useMemo(
    ()=>tambaJobs
      .filter(job=>job.archived)
      .sort((a,b)=>(b.date||'').localeCompare(a.date||'')),
    [tambaJobs]
  )
  const tambaCalendarEvents=useMemo(()=>activeTambaJobs
    .filter(job=>job.date>=today&&job.status!=='completed')
    .map(job=>({
      id:`tamba-${job.id}`,
      tambaJobId:job.id,
      title:job.title||'Tamba job',
      category:'tasks',
      type:'tamba_job',
      date:job.date,
      startTime:job.startTime||'09:00',
      endTime:job.endTime||'10:00',
      location:job.location||'',
      people:job.assignedToCiriloId||'',
      notes:job.notes||'',
      reminder:'15 min before',
      priority:'normal',
      completed:false,
      visibility:'private',
      sharedBy:job.createdByCiriloId||'',
      lockedForRecipient:Boolean(job.sourceOwnerUid&&job.sourceOwnerUid!==firebaseUser?.uid),
    })),[activeTambaJobs,today,firebaseUser?.uid])
  const weekDisplayEvents=useMemo(()=>[...liveEvents,...tambaCalendarEvents],[liveEvents,tambaCalendarEvents])

  if(authLoading)return <div className="app-loading"><img src="/logo.png" alt="Cirilo"/><span>Loading your week…</span></div>

  if(sharedNoteToken && !firebaseUser){
    return <SharedNotePage
      token={sharedNoteToken}
      onClose={()=>{
        setSharedNoteToken(null)
        const url=new URL(window.location.href)
        url.searchParams.delete('sharedNote')
        window.history.replaceState({},'',url)
      }}
      onSave={()=>{}}
      onJoin={()=>{
        localStorage.setItem('cirilo.pendingSharedNoteToken',sharedNoteToken)
        setSharedNoteToken(null)
        const url=new URL(window.location.href)
        url.searchParams.delete('sharedNote')
        window.history.replaceState({},'',url)
      }}
    />
  }

  if(sharedToken && !firebaseUser){
    return <SharedCardPage
      token={sharedToken}
      onClose={()=>{
        setSharedToken(null)
        const url=new URL(window.location.href)
        url.searchParams.delete('share')
        window.history.replaceState({},'',url)
      }}
      onAdd={()=>{}}
      onJoin={()=>{
        setSharedToken(null)
        const url=new URL(window.location.href)
        url.searchParams.delete('share')
        window.history.replaceState({},'',url)
      }}
    />
  }

  if(!firebaseUser)return <AuthScreen/>

  const seo=view==='plans'?{title:'Cirilo Plans — Publish public events from €9.99/month',description:'Use Cirilo free for personal planning. Publish public events with Cirilo Pro for €9.99/month or Business for €200/year for 5 users.'}:view==='discover'?{title:'Discover public events near you | Cirilo',description:'Discover public events, classes, meetups and community activities and add them directly to your weekly agenda with Cirilo.'}:{title:'Cirilo — Weekly planner, public events and life calendar',description:'A modern weekly planner for work, personal life, family, friends and tasks. Discover public events and add them directly to your week.'}

  if(publicProfileOpen)return <div className="app"><SeoMeta {...seo}/><PublicProfilePage profile={profile} events={myPublicEvents} onBack={()=>setPublicProfileOpen(false)} onAdd={addPublicToWeek} onOpen={setPublicOpen}/><PublicEventPage event={publicOpen} onClose={()=>setPublicOpen(null)} onAdd={addPublicToWeek}/></div>

  return <div className="app"><SeoMeta {...seo}/><header className="topbar"><div className="brand brand-with-demo"><img src="/logo.png" alt="Cirilo"/><button type="button" className="demo-text-badge" onClick={resetDemo} title="Reset demo" aria-label="Reset demo">Demo</button></div><nav className="main-tabs" aria-label="Main navigation"><button className={view==='week'?'active':''} onClick={()=>setView('week')}><CalendarDays size={15}/> Week</button><button className={view==='discover'?'active':''} onClick={()=>setView('discover')}><Compass size={15}/> Discover</button><button className={view==='tasks'?'active':''} onClick={()=>setView('tasks')}><ListTodo size={15}/> Tasks</button><button className={view==='notes'?'active':''} onClick={()=>setView('notes')}><BookOpenText size={15}/> Notes</button><button className={view==='inbox'?'active':''} onClick={()=>setView('inbox')}><Inbox size={15}/> Inbox</button><button className={view==='archive'?'active':''} onClick={()=>setView('archive')}><Archive size={15}/> Archive</button><button className={view==='profile'?'active':''} onClick={()=>setView('profile')}><UserRound size={15}/> Profile</button><button className={view==='plans'?'active':''} onClick={()=>setView('plans')}><WalletCards size={15}/> Plans</button></nav><div className="top-actions"><button className="account-chip" onClick={()=>setView('profile')}>{profile.photoURL?<img src={profile.photoURL} alt=""/>:<span>{profile.name.charAt(0)}</span>}<small>{profile.ciriloId}</small></button><button className="primary-btn" onClick={()=>openNew()}><Plus size={17}/> New item</button><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={16}/></button></div></header><main>{view==='week'&&<><section className="control-row"><div className="control-copy"><span className="eyebrow">Your week</span><span className="control-subtitle">Work, people and tasks in one calm view.</span></div><QuickAdd onAdd={openNew}/></section><section className="toolbar"><div className="week-nav"><button className="icon-btn" onClick={()=>setAnchor(subWeeks(anchor,1))}><ChevronLeft size={19}/></button><button className="today-btn" onClick={()=>setAnchor(new Date())}><CalendarDays size={16}/> Today</button><button className="icon-btn" onClick={()=>setAnchor(addWeeks(anchor,1))}><ChevronRight size={19}/></button><span className="week-range">{format(days[0],'MMM d')} — {format(days[6],'MMM d, yyyy')}</span></div><div className="category-filters">{Object.entries(CATEGORIES).map(([key,cat])=><button key={key} className={activeCats.has(key)?'active':''} onClick={()=>toggleCategory(key)}><i style={{background:cat.color}}/>{cat.label}</button>)}</div></section><section className="workspace"><div className="calendar-wrap"><WeekView days={days} events={weekDisplayEvents} activeCats={activeCats} onMove={(id,date)=>{if(date>=today)updateEvent({id,date})}} onOpen={openEdit} onCreate={openNew} onResize={resize} onShare={setShareOpen}/></div><WeekSummary events={weekEvents}/></section></>}{view==='discover'&&<DiscoverView events={[...myPublicEvents,...discoveryEvents]} onAdd={addPublicToWeek} onOpen={setPublicOpen}/>} {view==='archive'&&<ArchiveView events={archivedEvents} tambaJobs={archivedTambaJobs} onOpen={openArchive} onOpenTamba={openTambaJob}/>} {view==='profile'&&<ProfileView profile={profile} plan={plan} publicEvents={myPublicEvents} onSaved={refreshProfile} onOpenPublicProfile={()=>setPublicProfileOpen(true)} onPlans={()=>setView('plans')} onSendNote={sendNoteToContact} onProposeEvent={proposeEventToContact}/>} {view==='plans'&&<PlansView
  plan={plan}
  onChoose={async choice=>{
    if(choice==='pro'){
      await startProCheckout()
      return
    }

    if(choice==='manage'){
      await openBillingPortal()
      return
    }

    if(choice==='free'){
      if(plan==='pro'||plan==='business'){
        await openBillingPortal()
      }
      return
    }
  }}
/>} {view==='notes'&&<NotesView onAddToWeek={noteToWeek} onSendToEvent={noteToEvent} onShare={setNoteShareOpen} focusNoteId={focusNoteId} focusItemId={focusNoteItemId} recipientPrefill={noteRecipientPrefill} onRecipientPrefillConsumed={()=>setNoteRecipientPrefill('')} onFocusConsumed={()=>{setFocusNoteId('');setFocusNoteItemId('')}}/>} {view==='inbox'&&<InboxView addEvent={addEvent} onNoteToWeek={noteToWeek} onShareNoteItem={setNoteShareOpen} onAddTamba={addInboxTambaToWorkspace}/>} {view==='tasks'&&<TasksView
  taskEvents={taskEvents}
  jobs={activeTambaJobs}
  templates={tambaTemplates}
  currentCiriloId={authProfile?.ciriloId||''}
  onOpenTask={openEdit}
  onNewTask={()=>openNew({type:'task',category:'tasks'})}
  onNewJob={openTambaJob}
  onOpenJob={openTambaJob}
  onOpenTemplates={()=>setTambaTemplateOpen(true)}
  onCreateFromTemplate={createTambaFromTemplate}
  onTalentToWeek={talentToWeek}
  onTalentToNote={talentToNote}
/>}</main><EventModal open={modalOpen} draft={draft} readOnly={readOnly} canPublishPublic={canPublishPublic} onUpgrade={()=>{setModalOpen(false);setView('plans')}} onClose={()=>setModalOpen(false)} onSave={async payload=>{
  if(payload.visibility==='public'&&!canPublishPublic){
    setModalOpen(false)
    setView('plans')
    return
  }

  const baseNext=
    payload.visibility==='public'&&!payload.publicId
      ? {...payload,publicId:`public-${payload.id}`}
      : payload

  const next={
    ...baseNext,
    createdByUid:
      baseNext.createdByUid ||
      firebaseUser.uid,
    createdByCiriloId:
      baseNext.createdByCiriloId ||
      authProfile?.ciriloId ||
      '',
  }

  const previous=events.find(event=>event.id===next.id)

  if(previous){
    await updateEvent(next)
  }else{
    await addEvent(next)
  }

  if(next.sourceNoteId&&next.sourceNoteItemId){
    await markNoteItemScheduled(
      firebaseUser.uid,
      next.sourceNoteId,
      next.sourceNoteItemId
    )
  }

  if(next.visibility==='shared'){
    const oldCiriloIds=new Set(previous?.invitedCiriloIds||[])
    const oldEmails=new Set(previous?.invitedEmails||[])

    const newCiriloIds=(next.invitedCiriloIds||[]).filter(id=>!oldCiriloIds.has(id))
    const newEmails=(next.invitedEmails||[]).filter(email=>!oldEmails.has(email))

    if(newCiriloIds.length){
      await shareEventToCiriloMany({
        senderUid:firebaseUser.uid,
        senderCiriloId:authProfile.ciriloId,
        senderName:authProfile.displayName||firebaseUser.displayName||'Cirilo user',
        recipientCiriloIds:newCiriloIds,
        event:next,
      })
    }

    if(newEmails.length){
      const emailShares=await createEmailSharesMany({
        sender:{
          uid:firebaseUser.uid,
          ciriloId:authProfile.ciriloId,
          displayName:authProfile.displayName||firebaseUser.displayName||'Cirilo user',
        },
        recipientEmails:newEmails,
        event:next,
      })

      if(emailShares.length){
        openEmailClientForShares({
          senderName:authProfile.displayName||firebaseUser.displayName||'Cirilo user',
          event:next,
          shares:emailShares,
        })
      }
    }
  }

  setModalOpen(false)
}} onDelete={async id=>{await deleteEvent(id);setModalOpen(false)}}/><PublicEventPage event={publicOpen} onClose={()=>setPublicOpen(null)} onAdd={addPublicToWeek}/><ShareEventDialog
  event={shareOpen}
  open={Boolean(shareOpen)}
  onClose={()=>setShareOpen(null)}
  onShared={async ({type,value})=>{
    if(!shareOpen?.id)return

    const current=events.find(event=>event.id===shareOpen.id)
    if(!current)return

    if(type==='cirilo'){
      const invitedCiriloIds=[
        ...new Set([
          ...(current.invitedCiriloIds||[]),
          value,
        ]),
      ]

      await updateEvent({
        id:current.id,
        invitedCiriloIds,
      })

      setShareOpen(prev=>prev?{
        ...prev,
        invitedCiriloIds,
      }:prev)
    }

    if(type==='email'){
      const invitedEmails=[
        ...new Set([
          ...(current.invitedEmails||[]),
          value,
        ]),
      ]

      await updateEvent({
        id:current.id,
        invitedEmails,
      })

      setShareOpen(prev=>prev?{
        ...prev,
        invitedEmails,
      }:prev)
    }
  }}
/><NoteShareDialog
  open={Boolean(noteShareOpen)}
  payload={noteShareOpen}
  onClose={()=>setNoteShareOpen(null)}
  onShared={()=>{}}
/><TambaJobModal
  open={tambaJobOpen}
  draft={tambaJobDraft}
  today={today}
  currentUser={{
    uid:firebaseUser.uid,
    ciriloId:authProfile?.ciriloId||'',
  }}
  onClose={()=>{setTambaJobOpen(false);setTambaJobDraft(null)}}
  onSave={saveCurrentTambaJob}
  onShareCirilo={saveCurrentTambaJob}
  onAddToAgenda={addTambaToMyAgenda}
  onArchive={archiveCurrentTambaJob}
  onDelete={async id=>{
    const job=tambaJobs.find(item=>item.id===id)
    if(job)await deleteTambaJob(firebaseUser.uid,job)
    setTambaJobOpen(false)
    setTambaJobDraft(null)
  }}
  onStart={async job=>updateCurrentTambaStatus(job,'in_progress')}
  onComplete={async job=>updateCurrentTambaStatus(job,'completed')}
  onUploadProof={(jobId,file)=>uploadTambaProofPhoto(firebaseUser.uid,jobId,file)}
/><TambaTemplateModal
  open={tambaTemplateOpen}
  templates={tambaTemplates}
  onClose={()=>setTambaTemplateOpen(false)}
  onSave={template=>saveTambaTemplate(firebaseUser.uid,template)}
  onDelete={async templateId=>{
    await deleteTambaTemplate(firebaseUser.uid,templateId)
  }}
  onUse={createTambaFromTemplate}
/>{sharedNoteToken&&<SharedNotePage
  token={sharedNoteToken}
  onClose={()=>setSharedNoteToken(null)}
  onJoin={()=>{
    localStorage.setItem('cirilo.pendingSharedNoteToken',sharedNoteToken)
    setSharedNoteToken(null)
  }}
  onSave={async payload=>{
    const note=payload.type==='item'
      ? {
          title:payload.noteTitle||'Shared with me',
          universe:payload.universe||'personal',
          visibility:'private',
          items:[{...payload.item,id:crypto.randomUUID(),status:'active'}],
        }
      : {
          ...payload.note,
          id:undefined,
          visibility:'private',
          items:(payload.note?.items||[]).map(item=>({...item,id:crypto.randomUUID()})),
        }

    await saveNote(firebaseUser.uid,note)
    setSharedNoteToken(null)
    setView('notes')
  }}
/>}{sharedToken&&<SharedCardPage
  token={sharedToken}
  onClose={()=>setSharedToken(null)}
  onJoin={()=>{
    localStorage.setItem('cirilo.pendingShareToken',sharedToken)
    setSharedToken(null)
  }}
  onAdd={async event=>{
    await addEvent(event)
    setSharedToken(null)
    setView('week')
  }}
/>}</div>
}
