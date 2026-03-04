import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase Client ────────────────────────────────────────────────

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || '',
);

// ─── Data Definitions ───────────────────────────────────────────────

const SETTINGS = [1, 2, 3, 4, 5, 6];

// Parse "1/XXX.X" to probability
function p(s) {
  if (!s || s === '—') return null;
  const m = s.match(/^1\/([\d.]+)$/);
  return m ? 1 / parseFloat(m[1]) : null;
}

// Parse "XX.X%" to probability
function pPct(s) {
  if (!s || s === '—') return null;
  const m = s.match(/^([\d.]+)%$/);
  return m ? parseFloat(m[1]) / 100 : null;
}

const DATA_GROUPS = [
  // ─── 通常タブ ───
  {
    id: 'bonus_prob',
    name: 'ボーナス確率',
    tab: 'normal',
    denomSource: 'manual',
    denomKey: 'total_games',
    denomLabel: '総ゲーム数',
    items: [
      { id: 'big_total', label: 'BIG合算',
        probs: ['1/385.2','1/373.7','1/361.0','1/351.7','1/344.1','1/338.3'].map(p),
        realProbs: ['1/362.1','1/350.5','1/337.8','1/327.7','1/319.7','1/313.6'] },
      { id: 'reg', label: 'REG',
        probs: ['1/422.6','1/415.9','1/407.2','1/401.9','1/394.0','1/388.5'].map(p),
        realProbs: ['1/397.2','1/390.1','1/381.0','1/374.5','1/366.1','1/360.1'] },
    ],
  },
  {
    id: 'normal_bell',
    name: 'ベル揃い',
    tab: 'normal',
    denomSource: 'manual',
    denomKey: 'total_games',
    denomHidden: true,
    denomLabel: '総ゲーム数',
    items: [
      { id: 'bell_total', label: 'ベル揃い合算', estimated: true,
        probs: ['1/29.4','1/28.1','1/26.7','1/25.0','1/23.7','1/23.3'].map(p).map(cb => 1/9.0 + cb) },
    ],
  },
  {
    id: 'normal_koyaku',
    name: '通常時小役',
    tab: 'normal',
    countOnly: true,
    denomSource: 'manual',
    denomKey: 'total_games',
    denomHidden: true,
    denomLabel: '総ゲーム数',
    items: [
      { id: 'bell_2choice', label: 'ベル(2択)', refProb: '1/4.5' },
      { id: 'bell_common', label: 'ベル(共通)', refProb: '1/29.4' },
      { id: 'one_a', label: '1枚役A', refProb: '1/130.5' },
      { id: 'one_b', label: '1枚役B', refProb: '1/102.1' },
      { id: 'one_c', label: '1枚役C', refProb: '1/114.2' },
      { id: 'suika_a', label: 'スイカA', refProb: '1/161.4' },
      { id: 'suika_b', label: 'スイカB', refProb: '1/250.1' },
      { id: 'cherry', label: 'チェリー', refProb: null },
      { id: 'reach_replay', label: 'リーチ目リプレイ', refProb: null },
      { id: 'kakutei_a', label: '確定役A', refProb: '1/16384' },
      { id: 'kakutei_b', label: '確定役B', refProb: '1/8192' },
    ],
  },
  {
    id: 'stechen',
    name: 'ステチェン',
    tab: 'normal',
    denomSource: 'auto',
    items: [
      { id: 'logo_small', label: 'ロゴ発光[小]', denomPart: true },
      { id: 'logo_big', label: 'ロゴ発光[大]', probs: ['70.8%','75.0%','68.8%','75.0%','66.7%','75.0%'].map(pPct) },
    ],
  },
  // ─── ボーナスタブ ───
  {
    id: 'rb_chu',
    name: 'RB中',
    tab: 'bonus',
    denomSource: 'manual',
    denomKey: 'rb_games',
    denomLabel: 'RB消化G数',
    items: [
      { id: 'blue7_naname', label: '青7斜め揃い', probs: ['1/555.4','1/474.9','1/442.8','1/300.6','1/268.6','1/258.0'].map(p) },
    ],
  },
  {
    id: 'bonus_end_screen',
    name: 'ボーナス終了画面',
    tab: 'bonus',
    denomSource: 'auto',
    filterMode: true,
    items: [
      { id: 'be_default', label: 'デフォルト/変更濃厚', denomPart: true },
      { id: 'be_age', label: 'アゲ濃厚(2以上)', filter: [0,1,1,1,1,1] },
      { id: 'be_2up', label: '2以上濃厚', filter: [0,1,1,1,1,1] },
      { id: 'be_246', label: '2・4・6濃厚', filter: [0,1,0,1,0,1] },
      { id: 'be_4up', label: '4以上濃厚', filter: [0,0,0,1,1,1] },
      { id: 'be_5up', label: '5以上濃厚', filter: [0,0,0,0,1,1] },
      { id: 'be_6', label: '6濃厚', filter: [0,0,0,0,0,1] },
    ],
  },
  {
    id: 'rb_chara',
    name: 'RB中キャラ紹介',
    tab: 'bonus',
    denomSource: 'auto',
    filterMode: true,
    items: [
      { id: 'rc_normal', label: '通常/銀背景', denomPart: true },
      { id: 'rc_willard', label: '金:ウィラード(2以上)', filter: [0,1,1,1,1,1] },
      { id: 'rc_rion', label: '金:右代宮理御(2以上)', filter: [0,1,1,1,1,1] },
      { id: 'rc_erika', label: '金:ドレスヱリカ(4以上)', filter: [0,0,0,1,1,1] },
      { id: 'rc_gm', label: '金:GM戦人(5以上)', filter: [0,0,0,0,1,1] },
    ],
  },
  {
    id: 'bb_vita1',
    name: 'BB中ビタ(1回目)',
    tab: 'bonus',
    denomSource: 'auto',
    filterMode: true,
    items: [
      { id: 'v1_battler', label: '戦人 (デフォルト)', denomPart: true },
      { id: 'v1_maria', label: '真里亞 (偶数!?)', denomPart: true },
      { id: 'v1_jessica', label: '朱志香 (設定1否定)', filter: [0,1,1,1,1,1] },
      { id: 'v1_george', label: '譲治 (設定2否定)', filter: [1,0,1,1,1,1] },
    ],
  },
  {
    id: 'bb_vita2',
    name: 'BB中ビタ(2回目以降)',
    tab: 'bonus',
    countOnly: true,
    denomSource: 'auto',
    items: [
      { id: 'v2_default', label: 'デフォルト' },
      { id: 'v2_erika_enje', label: 'ヱリカ&縁寿 (偶数)' },
      { id: 'v2_zepar', label: 'ゼパル&フルフル (奇数)' },
      { id: 'v2_siesta', label: 'シエスタ (偶数+チャンス)' },
      { id: 'v2_aunt', label: '叔母 (奇数+チャンス)' },
      { id: 'v2_enje7', label: '縁寿&七姉妹 (大チャンス)' },
      { id: 'v2_mini', label: 'ミニキャラ (超チャンス)' },
    ],
  },
  // ─── ARTタブ ───
  {
    id: 'art_koyaku',
    name: 'ART中小役',
    tab: 'art',
    denomSource: 'manual',
    denomKey: 'art_games',
    denomLabel: 'ART消化G数',
    items: [
      { id: 'art_bell', label: '共通ベル', estimated: true, probs: ['1/29.4','1/28.1','1/26.7','1/25.0','1/23.7','1/23.3'].map(p) },
    ],
  },
  {
    id: 'cz_navi',
    name: '運命分岐(CZ天井) 初期ナビ率',
    tab: 'art',
    countOnly: true,
    denomSource: 'auto',
    items: [
      { id: 'cz_navi_30', label: '30%' },
      { id: 'cz_navi_50', label: '50%' },
      { id: 'cz_navi_70', label: '70%' },
      { id: 'cz_navi_stock', label: 'ストック1' },
    ],
  },
];

const TABS = [
  { id: 'result', label: '設定期待度', isResult: true },
  { id: 'normal', label: '通常' },
  { id: 'bonus', label: 'ボーナス' },
  { id: 'art', label: 'ART' },
  { id: 'memo', label: 'メモ', isMemo: true },
];

// ─── Supabase DB Helpers ────────────────────────────────────────────

async function dbGetAll() {
  const { data, error } = await supabase
    .from('sessions')
    .select('data');
  if (error) throw error;
  return (data || []).map((row) => row.data);
}

async function dbPut(session) {
  const { error } = await supabase
    .from('sessions')
    .upsert({ id: session.id, data: session }, { onConflict: 'id' });
  if (error) throw error;
}

async function dbDelete(id) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Estimation Engine ──────────────────────────────────────────────

function computePosterior(session) {
  const counts = session.counts || {};
  const denoms = session.denoms || {};

  // Map start values to bonus_prob items
  const startBonus = {
    big_total: session.startBig || 0,
    reg: session.startReg || 0,
  };
  const startGames = session.startGames || 0;

  // Start with uniform prior (log space)
  const logLikelihood = SETTINGS.map(() => 0);
  const filterMask = SETTINGS.map(() => true);

  const impacts = [];

  for (const group of DATA_GROUPS) {
    if (group.countOnly) continue;

    if (group.filterMode) {
      for (const item of group.items) {
        if (!item.filter) continue;
        const count = counts[item.id] || 0;
        if (count > 0) {
          SETTINGS.forEach((_, si) => {
            if (item.filter[si] === 0) {
              filterMask[si] = false;
            }
          });
        }
      }
      continue;
    }

    // Binomial mode
    let denom = 0;
    if (group.denomSource === 'manual') {
      denom = denoms[group.denomKey] || 0;
    } else if (group.denomSource === 'auto') {
      denom = group.items.reduce((sum, it) => sum + (counts[it.id] || 0), 0);
    }

    // Add start games to groups sharing total_games denominator
    if (group.id === 'bonus_prob' || group.id === 'normal_bell') {
      denom += startGames;
    }

    if (denom <= 0) continue;

    for (const item of group.items) {
      if (item.denomPart || !item.probs) continue;
      let k = counts[item.id] || 0;

      // Add start bonus counts
      if (group.id === 'bonus_prob' && startBonus[item.id]) {
        k += startBonus[item.id];
      }

      const itemLogL = SETTINGS.map((_, si) => {
        const prob = item.probs[si];
        if (prob == null || prob <= 0 || prob >= 1) return 0;
        return k * Math.log(prob) + (denom - k) * Math.log(1 - prob);
      });

      SETTINGS.forEach((_, si) => {
        logLikelihood[si] += itemLogL[si];
      });

      impacts.push({ item, group, k, n: denom, logL: itemLogL });
    }
  }

  // Uniform prior in log space
  const logPrior = Math.log(1 / 6);
  const logPosterior = SETTINGS.map((_, si) => logPrior + logLikelihood[si]);

  // Apply filter mask
  const masked = logPosterior.map((lp, si) => (filterMask[si] ? lp : -Infinity));

  // Numerical stability: subtract max
  const maxLog = Math.max(...masked.filter(v => v !== -Infinity));
  if (maxLog === -Infinity) {
    return { probs: SETTINGS.map(() => 0), filterMask, impacts };
  }

  const expValues = masked.map(v => (v === -Infinity ? 0 : Math.exp(v - maxLog)));
  const sum = expValues.reduce((a, b) => a + b, 0);
  const probs = expValues.map(v => (sum > 0 ? v / sum : 0));

  return { probs, filterMask, impacts };
}

// ─── Utility ────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatProb(prob) {
  if (prob == null) return '—';
  return '1/' + (1 / prob).toFixed(1);
}

function createSession(data) {
  return {
    id: generateId(),
    date: data.date || todayStr(),
    shop: data.shop || '未入力',
    machine: data.machine || '—',
    startGames: parseInt(data.startGames) || 0,
    startBig: parseInt(data.startBig) || 0,
    startReg: parseInt(data.startReg) || 0,
    counts: {},
    denoms: {},
    memo: '',
    createdAt: Date.now(),
  };
}

// ─── Components ─────────────────────────────────────────────────────

function Counter({ value, onChange }) {
  const handleInput = (e) => {
    const v = parseInt(e.target.value);
    onChange(isNaN(v) ? 0 : Math.max(0, v));
  };
  return (
    <div className="counter-controls">
      <button className="counter-btn" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <input
        type="number"
        className={'counter-value' + (value > 0 ? ' has-value' : '')}
        value={value}
        onChange={handleInput}
        min="0"
      />
      <button className="counter-btn" onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function DenomInput({ value, onChange, label, auto }) {
  if (auto !== undefined) {
    return (
      <div className="denom-input auto">
        <span className="denom-label">{label}:</span>
        <span>{auto}</span>
      </div>
    );
  }
  return (
    <div className="denom-input">
      <span className="denom-label">{label}:</span>
      <Counter value={value} onChange={onChange} />
    </div>
  );
}

function AccordionGroup({ group, counts, denoms, onCountChange, onDenomChange }) {
  const [open, setOpen] = useState(false);

  const totalCount = group.items.reduce((sum, it) => sum + (counts[it.id] || 0), 0);
  const hasInput = totalCount > 0 || (group.denomKey && (denoms[group.denomKey] || 0) > 0);

  const autoDenom = group.denomSource === 'auto'
    ? group.items.reduce((sum, it) => sum + (counts[it.id] || 0), 0)
    : null;

  const modeLabel = group.countOnly ? 'COUNT' : group.filterMode ? 'FILTER' : null;

  return (
    <div className={'accordion' + (hasInput ? ' has-input' : '')}>
      <button className="accordion-header" onClick={() => setOpen(!open)}>
        <span className={'accordion-arrow' + (open ? ' open' : '')}>&#9654;</span>
        <span className="accordion-title">{group.name}</span>
        {totalCount > 0 && <span className="accordion-badge badge-count">{totalCount}</span>}
        {modeLabel && (
          <span className={'accordion-badge ' + (group.filterMode ? 'badge-filter' : 'badge-countonly')}>
            {modeLabel}
          </span>
        )}
      </button>
      {open && (
        <div className="accordion-body">
          {group.denomSource === 'manual' && !group.denomHidden && (
            <DenomInput
              label={group.denomLabel}
              value={denoms[group.denomKey] || 0}
              onChange={(v) => onDenomChange(group.denomKey, v)}
            />
          )}
          {group.denomSource === 'manual' && group.denomHidden && (
            <div className="denom-display">
              {group.denomLabel}: {denoms[group.denomKey] || 0}
            </div>
          )}
          {group.denomSource === 'auto' && (
            <DenomInput label="合計" auto={autoDenom} />
          )}
          {group.items.map((item) => (
            <div className="counter-row" key={item.id}>
              <div className="counter-label">
                {item.label}
                {item.filter && <span className="filter-tag"> [確定]</span>}
              </div>
              <Counter
                value={counts[item.id] || 0}
                onChange={(v) => onCountChange(item.id, v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingBars({ result }) {
  const { probs, filterMask } = result;
  const maxProb = Math.max(...probs);

  const barColors = [
    '#94a3c0', '#8a9ab8', '#7e90b0', '#7086a8', '#6078a0', '#446cb2',
  ];

  return (
    <div>
      {SETTINGS.map((s, i) => {
        const pct = (probs[i] * 100).toFixed(1);
        const isTop = probs[i] === maxProb && maxProb > 0;
        const isFiltered = !filterMask[i];
        let cls = 'setting-bar-row';
        if (isFiltered) cls += ' filtered';
        if (isTop && !isFiltered) cls += ' highlight';
        return (
          <div className={cls} key={s}>
            <span className="label">設定{s}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.min(probs[i] * 100, 100)}%`,
                  background: isTop && !isFiltered ? '#c89530' : barColors[i],
                }}
              />
            </div>
            <span className="pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function ResultPanel({ session }) {
  const result = useMemo(() => computePosterior(session), [session]);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="result-panel">
      <h3>設定期待度</h3>
      <SettingBars result={result} />
      <div className="detail-accordion">
        <button className="detail-accordion-header" onClick={() => setDetailOpen(!detailOpen)}>
          {detailOpen ? '▼' : '▶'} 要素別詳細
        </button>
        {detailOpen && (
          <div className="impact-list">
            {result.impacts.length === 0 && !result.filterMask.some(v => !v) && (
              <div className="impact-item">
                <span style={{ color: 'var(--textMuted)' }}>データなし</span>
              </div>
            )}
            {result.impacts.map((imp, idx) => (
              <div className="impact-item" key={idx}>
                <span>{imp.group.name} / {imp.item.label}</span>
                <span className="impact-value">{imp.k}/{imp.n}</span>
              </div>
            ))}
            {!result.filterMask.every(Boolean) && (
              <div className="impact-item" style={{ borderTop: '1px solid var(--divider)', paddingTop: 6, marginTop: 4 }}>
                <span style={{ color: 'var(--pink)' }}>
                  フィルター除外: {SETTINGS.filter((_, i) => !result.filterMask[i]).map(s => `設定${s}`).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProbabilityTable() {
  return (
    <div>
      {DATA_GROUPS.map((group) => (
        <div className="prob-section" key={group.id}>
          <h4>{group.name}</h4>
          <div className="table-scroll">
            <table className="prob-table">
              <thead>
                <tr>
                  <th>項目</th>
                  {SETTINGS.map(s => <th key={s}>設定{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  if (item.denomPart && !item.probs && !item.filter) {
                    return (
                      <tr key={item.id}>
                        <td>{item.label}</td>
                        {SETTINGS.map(s => <td key={s}>—</td>)}
                      </tr>
                    );
                  }
                  if (item.filter) {
                    return (
                      <tr key={item.id}>
                        <td>{item.label}</td>
                        {SETTINGS.map((s, si) => (
                          <td key={s} className={item.filter[si] ? 'filter-yes' : 'filter-no'}>
                            {item.filter[si] ? '○' : '×'}
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  if (item.probs) {
                    return (
                      <Fragment key={item.id}>
                        <tr>
                          <td>
                            {item.label}{item.realProbs ? ' (履歴)' : ''}
                            {item.estimated && <span className="estimated-badge">※推測値</span>}
                          </td>
                          {SETTINGS.map((s, si) => (
                            <td key={s}>{formatProb(item.probs[si])}</td>
                          ))}
                        </tr>
                        {item.realProbs && (
                          <tr className="real-prob-row">
                            <td>{item.label} (実確率)</td>
                            {SETTINGS.map((s, si) => (
                              <td key={s}>{item.realProbs[si]}</td>
                            ))}
                          </tr>
                        )}
                      </Fragment>
                    );
                  }
                  // countOnly item with refProb
                  if (group.countOnly) {
                    return (
                      <tr key={item.id}>
                        <td>{item.label}</td>
                        <td>
                          {item.refProb || '—'}
                          {!item.refProb && <div className="investigating">確率不明</div>}
                        </td>
                        {SETTINGS.slice(1).map(s => (
                          <td key={s} className="investigating">
                            {item.refProb ? '設定差調査中' : '—'}
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionForm({ onSubmit, onCancel }) {
  const [date, setDate] = useState(todayStr());
  const [shop, setShop] = useState('');
  const [machine, setMachine] = useState('');
  const [startGames, setStartGames] = useState('');
  const [startBig, setStartBig] = useState('');
  const [startReg, setStartReg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ date, shop, machine, startGames, startBig, startReg });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>新規セッション作成</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>日付 *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>店名</label>
            <input type="text" value={shop} onChange={(e) => setShop(e.target.value)} placeholder="未入力" />
          </div>
          <div className="form-group">
            <label>台番号</label>
            <input type="text" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="—" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>総G数(打ち初め)</label>
              <input type="number" value={startGames} onChange={(e) => setStartGames(e.target.value)} placeholder="0" min="0" />
            </div>
            <div className="form-group">
              <label>BIG(打ち初め)</label>
              <input type="number" value={startBig} onChange={(e) => setStartBig(e.target.value)} placeholder="0" min="0" />
            </div>
            <div className="form-group">
              <label>REG(打ち初め)</label>
              <input type="number" value={startReg} onChange={(e) => setStartReg(e.target.value)} placeholder="0" min="0" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="btn btn-accent">作成</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>セッションを削除しますか？</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--textSub)' }}>この操作は取り消せません。</p>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn btn-red" onClick={onConfirm}>削除</button>
        </div>
      </div>
    </div>
  );
}


function SessionCard({ session, onClick, onDelete }) {
  const result = useMemo(() => computePosterior(session), [session]);
  const totalInputs = Object.values(session.counts || {}).reduce((a, b) => a + b, 0);
  const totalGames = (session.denoms || {}).total_games || 0;
  const hasData = totalInputs > 0 || totalGames > 0;
  const hasStart = session.startGames > 0 || session.startBig > 0 || session.startReg > 0;

  const maxProb = Math.max(...result.probs);
  const topSettings = SETTINGS.filter((_, i) => result.probs[i] === maxProb && maxProb > 0);

  return (
    <div className="card" onClick={onClick}>
      <div className="card-header">
        <div>
          <div className="card-date">{session.date}</div>
          <div className="card-title">
            {session.shop} #{session.machine}
          </div>
        </div>
        <button
          className="card-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="削除"
        >
          🗑
        </button>
      </div>
      <div className="card-meta">
        {totalGames > 0 && <span>{totalGames}G</span>}
        {totalGames > 0 && totalInputs > 0 && ' / '}
        {totalInputs > 0 && <span>入力{totalInputs}件</span>}
        {!hasData && <span>データなし</span>}
      </div>
      {hasStart && (
        <div className="card-meta">
          打ち初め: {session.startGames}G / B{session.startBig} / R{session.startReg}
        </div>
      )}
      {hasData && topSettings.length > 0 && (
        <div className="card-summary">
          {topSettings.map((s) => (
            <span className="card-badge" key={s}>
              設定{s} {(result.probs[s - 1] * 100).toFixed(1)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionDetail({ session, onBack, onUpdate }) {
  const [page, setPage] = useState('estimate');
  const [activeTab, setActiveTab] = useState('result');
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimer = useRef(null);

  const save = useCallback(async (updated) => {
    setSaveStatus('saving');
    try {
      await dbPut(updated);
      setSaveStatus('saved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveStatus('idle'), 1500);
    } catch {
      setSaveStatus('error');
    }
  }, []);

  const handleCountChange = useCallback((itemId, value) => {
    onUpdate((prev) => {
      const updated = { ...prev, counts: { ...prev.counts, [itemId]: value } };
      save(updated);
      return updated;
    });
  }, [save, onUpdate]);

  const handleDenomChange = useCallback((denomKey, value) => {
    onUpdate((prev) => {
      const updated = { ...prev, denoms: { ...prev.denoms, [denomKey]: value } };
      save(updated);
      return updated;
    });
  }, [save, onUpdate]);

  const handleMemoChange = useCallback((memo) => {
    onUpdate((prev) => {
      const updated = { ...prev, memo };
      save(updated);
      return updated;
    });
  }, [save, onUpdate]);

  const handleReset = useCallback(() => {
    if (!confirm('カウントと分母をリセットしますか？（メモは保持されます）')) return;
    onUpdate((prev) => {
      const updated = { ...prev, counts: {}, denoms: {} };
      save(updated);
      return updated;
    });
  }, [save, onUpdate]);

  const tabGroups = useMemo(
    () => DATA_GROUPS.filter((g) => g.tab === activeTab),
    [activeTab]
  );

  const tabHasInput = useMemo(() => {
    const result = {};
    for (const tab of TABS) {
      if (tab.isResult) {
        const totalInputs = Object.values(session.counts || {}).reduce((a, b) => a + b, 0);
        const totalDenoms = Object.values(session.denoms || {}).reduce((a, b) => a + b, 0);
        result[tab.id] = totalInputs > 0 || totalDenoms > 0;
      } else if (tab.isMemo) {
        result[tab.id] = !!(session.memo && session.memo.trim());
      } else {
        const groups = DATA_GROUPS.filter((g) => g.tab === tab.id);
        result[tab.id] = groups.some((g) =>
          g.items.some((it) => (session.counts?.[it.id] || 0) > 0)
        ) || groups.some((g) => g.denomKey && (session.denoms?.[g.denomKey] || 0) > 0);
      }
    }
    return result;
  }, [session]);

  const hasStart = session.startGames > 0 || session.startBig > 0 || session.startReg > 0;

  const saveStatusText = {
    idle: '自動保存',
    saving: '保存中...',
    saved: '✓ 保存済',
    error: '保存エラー',
  };

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← 一覧へ</button>
        <div className="page-toggle">
          <button className={page === 'estimate' ? 'active' : ''} onClick={() => setPage('estimate')}>推測</button>
          <button className={page === 'probability' ? 'active' : ''} onClick={() => setPage('probability')}>確率</button>
        </div>
        <button className="reset-btn" onClick={handleReset}>リセット</button>
        <span className={`save-status ${saveStatus}`}>{saveStatusText[saveStatus]}</span>
      </div>
      <div className="detail-info">
        <span>{session.date}</span>
        {' '}
        <span className="shop">{session.shop}</span>
        {' '}
        <span>#{session.machine}</span>
        {hasStart && (
          <span className="start-badge" style={{ marginLeft: 8 }}>
            打ち初め: {session.startGames}G / B{session.startBig} / R{session.startReg}
          </span>
        )}
      </div>

      {page === 'probability' ? (
        <div style={{ marginTop: 16 }}>
          <ProbabilityTable />
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div className="tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={'tab' + (activeTab === tab.id ? ' active' : '')}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tabHasInput[tab.id] && <span className="dot" />}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'result' ? (
              <ResultPanel session={session} />
            ) : activeTab === 'memo' ? (
              <textarea
                className="memo-area"
                value={session.memo || ''}
                onChange={(e) => handleMemoChange(e.target.value)}
                placeholder="自由にメモを入力..."
              />
            ) : (
              <>
                {activeTab === 'normal' && (
                  <DenomInput
                    label="総ゲーム数"
                    value={session.denoms?.total_games || 0}
                    onChange={(v) => handleDenomChange('total_games', v)}
                  />
                )}
                {tabGroups.map((group) => (
                  <AccordionGroup
                    key={group.id}
                    group={group}
                    counts={session.counts || {}}
                    denoms={session.denoms || {}}
                    onCountChange={handleCountChange}
                    onDenomChange={handleDenomChange}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Login ──────────────────────────────────────────────────────────

const EMAIL_DOMAIN = '@slo-cal.app';

function LoginForm({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: userId + EMAIL_DOMAIN,
      password,
    });
    setLoading(false);
    if (err) {
      setError('IDまたはパスワードが違います');
    } else {
      onLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>ログイン</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn btn-accent login-btn" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────

export default function App() {
  const [authUser, setAuthUser] = useState(undefined);
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    dbGetAll().then((data) => {
      setSessions(data.sort((a, b) => b.createdAt - a.createdAt));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [authUser]);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentId) || null,
    [sessions, currentId]
  );

  const handleCreate = async (data) => {
    const session = createSession(data);
    await dbPut(session);
    setSessions((prev) => [session, ...prev]);
    setShowForm(false);
    setCurrentId(session.id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await dbDelete(deleteId);
    setSessions((prev) => prev.filter((s) => s.id !== deleteId));
    setDeleteId(null);
  };

  const handleUpdateSession = useCallback((updater) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === currentId ? (typeof updater === 'function' ? updater(s) : updater) : s))
    );
  }, [currentId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessions([]);
    setLoaded(false);
  };

  if (authUser === undefined) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--textMuted)' }}>読み込み中...</div>;
  }

  if (!authUser) {
    return <LoginForm onLogin={() => {}} />;
  }

  if (!loaded) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--textMuted)' }}>読み込み中...</div>;
  }

  if (currentSession) {
    return (
      <SessionDetail
        session={currentSession}
        onBack={() => setCurrentId(null)}
        onUpdate={handleUpdateSession}
      />
    );
  }

  return (
    <div>
      <div className="app-header">
        <h1>Lうみねこのなく頃に2</h1>
        <div className="subtitle">設定推測ツール</div>
        <button className="logout-btn" onClick={handleLogout}>ログアウト</button>
      </div>

      <div className="action-bar">
        <button className="btn btn-accent" onClick={() => setShowForm(true)}>新規作成</button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <div>まだ履歴がありません</div>
        </div>
      ) : (
        sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onClick={() => setCurrentId(session.id)}
            onDelete={() => setDeleteId(session.id)}
          />
        ))
      )}

      {showForm && (
        <SessionForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {deleteId && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
