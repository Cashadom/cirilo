export const PROFILE_TYPES = {
  personal: { key:'personal', label:'Personal', description:'Your Cirilo workspace is private by default.', defaultEventVisibility:'private' },
  public: { key:'public', label:'Public', description:'Calendar events are public by default. Internal work stays private.', defaultEventVisibility:'public' },
  company: { key:'company', label:'Company', description:'Calendar events are shared by default. Public publishing requires a paid plan.', defaultEventVisibility:'shared' },
}

export const PROFILE_TYPE_OPTIONS = Object.values(PROFILE_TYPES)

export function normalizeProfileType(value){
  return PROFILE_TYPES[value] ? value : 'personal'
}

export function getDefaultEventVisibility(profileType,itemType='event'){
  if(itemType==='task') return 'private'
  return PROFILE_TYPES[normalizeProfileType(profileType)].defaultEventVisibility
}

export function getProfileTypeMeta(profileType){
  return PROFILE_TYPES[normalizeProfileType(profileType)]
}

export const ORGANIZATION_TYPES = {
  municipality: { key:'municipality', label:'Municipality', requiresVerification:true },
  school: { key:'school', label:'School', requiresVerification:false },
  university: { key:'university', label:'University', requiresVerification:false },
  association: { key:'association', label:'Association', requiresVerification:false },
  cultural: { key:'cultural', label:'Cultural venue', requiresVerification:false },
  public_organization: { key:'public_organization', label:'Public organization', requiresVerification:false },
}

export const ORGANIZATION_TYPE_OPTIONS = Object.values(ORGANIZATION_TYPES)

export function normalizeOrganizationType(value){
  return ORGANIZATION_TYPES[value] ? value : ''
}

export function isMunicipalityIdentityLocked(profile = {}){
  return (
    profile.municipalityVerificationStatus === 'verified' &&
    normalizeProfileType(profile.profileType) === 'public' &&
    normalizeOrganizationType(profile.organizationType) === 'municipality'
  )
}

export function isVerifiedMunicipality(profile = {}){
  return isMunicipalityIdentityLocked(profile)
}

export const COMPANY_EVENT_TYPES = {
  conference: { key:'conference', label:'Conference' },
  meeting: { key:'meeting', label:'Meeting' },
  recruitment: { key:'recruitment', label:'Recruitment' },
  trade_show: { key:'trade_show', label:'Trade show' },
  event: { key:'event', label:'Event' },
  other: { key:'other', label:'Other' },
}

export const COMPANY_EVENT_TYPE_OPTIONS = Object.values(COMPANY_EVENT_TYPES)

export function normalizeCompanyEventType(value){
  return COMPANY_EVENT_TYPES[value] ? value : 'event'
}
