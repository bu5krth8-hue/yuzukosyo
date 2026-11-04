// Town level and the previously earned resident population have separate curves.
export function townLevel(exp,coefficient=60){
 if(!Number.isSafeInteger(exp)||exp<0)throw Error('town_exp');
 const e=BigInt(exp),c=BigInt(coefficient);let lo=1n,hi=1000000000n;
 while(lo<hi){const mid=(lo+hi+1n)/2n;if(c*mid*(mid-1n)<=e)lo=mid;else hi=mid-1n;}
 return Number(lo);
}
