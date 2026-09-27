export function normalizeFoundingLead(input){
  const email=String(input?.email || '').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) throw new Error('Enter a valid email address.');
  if(input?.consent!==true) throw new Error('Email consent is required.');
  const source=String(input?.source || 'founding-modal').trim().slice(0,80) || 'founding-modal';
  return {email,source,consent:true};
}
