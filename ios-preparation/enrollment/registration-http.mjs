import {createEnrollmentHttpHandler} from './enrollment-http.mjs';
import {createEnrollmentResumeHttpHandler} from './resume-http.mjs';
import {createRecoveryHttpHandler} from './recovery-http.mjs';

export function createRegistrationHttpHandler({enrollment, resume, recovery, ...options}) {
 const initial = createEnrollmentHttpHandler({...options, service: enrollment});
 const pending = createEnrollmentResumeHttpHandler({...options, service: resume});
 const committed = createRecoveryHttpHandler({...options, service: recovery});
 return request => {
  const {pathname} = new URL(request.url);
  if (pathname.startsWith('/v1/ios/enrollment/resume/')) return pending(request);
  if (pathname.startsWith('/v1/ios/recovery/')) return committed(request);
  return initial(request);
 };
}
