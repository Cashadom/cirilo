import React from 'react'
import { CalendarPlus } from 'lucide-react'
import PublicEventCard from './PublicEventCard'
export default function DiscoverView({events,onAdd,onOpen}){return <section className="discover-view"><div className="discover-intro"><div><span className="eyebrow">Discover</span><h2>Public events that can fit your week.</h2><p>Join a session, save an event or add it directly to your Cirilo calendar.</p></div><div className="discover-rule"><CalendarPlus size={17}/><span>No endless feed. Only things you can actually do.</span></div></div><div className="public-grid">{events.map(event=><PublicEventCard key={event.publicId} event={event} onAdd={onAdd} onOpen={onOpen}/>)}</div></section>}
