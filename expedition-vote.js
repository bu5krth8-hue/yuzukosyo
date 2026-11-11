const $ = id => document.getElementById(id);
let catalogue;
let busy = false;

async function request(path, options) {
  const response = await fetch(path, { cache: 'no-store', ...options });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function render({ poll, signedIn, csrf }) {
  $('login').hidden = signedIn || !poll || poll.closed;
  $('regions').replaceChildren();
  if (!poll) {
    $('status').textContent = '次の投票は、配信終了後に受け付けます。';
    return;
  }
  const title = id => catalogue.get(id)?.name || `地域 ${id + 1}`;
  $('status').textContent = poll.closed
    ? (poll.winner === null ? '投票を終了しました。' : `投票結果　${title(poll.winner)}`)
    : poll.voted !== null ? `${title(poll.voted)}に投票済みです。`
    : signedIn ? '行きたい地域を選んでください。投票後の変更はできません。'
    : '投票するには柚RPGにログインしてください。';
  const counts = new Map(poll.tally.map(row => [row.region, row.total]));
  for (const id of poll.candidates) {
    const card = document.createElement('article');
    const name = document.createElement('h2');
    const count = document.createElement('p');
    card.dataset.winner = String(poll.winner === id);
    name.textContent = `${String(id + 1).padStart(3, '0')}　${title(id)}`;
    count.textContent = `${counts.get(id) || 0}票${poll.winner === id ? '・遠征先に決定' : ''}`;
    card.append(name, count);
    if (signedIn && !poll.closed && poll.voted === null) {
      const button = document.createElement('button');
      button.textContent = 'ここに投票する';
      button.setAttribute('aria-label', `${title(id)}に投票する`);
      button.onclick = () => {
        if (window.confirm(`${title(id)}に投票しますか？`)) {
          update({ poll: poll.id, region: id, csrf });
        }
      };
      card.append(button);
    }
    $('regions').append(card);
  }
}

async function update(ballot) {
  if (busy) return;
  busy = true;
  $('refresh').disabled = true;
  for (const button of $('regions').querySelectorAll('button')) button.disabled = true;
  try {
    if (!catalogue) catalogue = new Map((await request('/rpg-catalogue.json')).regions.map(row => [row.id, row]));
    const options = ballot && {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ballot),
    };
    render(await request('/api/expedition-vote', options));
  } catch {
    $('regions').replaceChildren();
    $('status').textContent = ballot
      ? '投票の結果を確認できませんでした。「最新の状況を見る」で確認してください。'
      : '投票状況を確認できませんでした。時間をおいて再読み込みしてください。';
  } finally {
    busy = false;
    $('refresh').disabled = false;
  }
}

$('refresh').onclick = () => update();
update();
