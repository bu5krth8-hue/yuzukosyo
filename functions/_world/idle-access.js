import {currentSession} from '../api/rpg-account.js';
import {OWNER} from './config.js';
export async function idleSession(request,env){if(!env.RPG_SUPPORT||!env.RPG_TOWN)throw Error('not_configured');if(env.RPG_IDLE_ENABLED==='0')throw Error('disabled');const session=await currentSession(request,env.RPG_SUPPORT);if(!session)throw Error('login_required');if(session.public_id!==OWNER)throw Error('owner_only');return session;}
