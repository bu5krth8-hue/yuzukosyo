export function normalized(value){return String(value??'').normalize('NFKC').toLocaleLowerCase('ja-JP').trim();}
export function matchesJob(job,search,category,ownership,owned){
 if(category&&category!=='all'&&job.category!==category)return false;
 if(ownership==='owned'&&!owned||ownership==='locked'&&owned)return false;
 const text=normalized([job.number,job.name,job.job,job.task,job.description,job.category].filter(Boolean).join(' '));
 return normalized(search).split(/\s+/).every(word=>text.includes(word));
}
