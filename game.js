// ===== Tower of Hanoi Game =====
(function () {
    'use strict';

    // --- User Identity (UUID v4) ---
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
    function getUserId() {
        let uid = localStorage.getItem('hanoi-user-id');
        if (!uid) {
            uid = generateUUID();
            localStorage.setItem('hanoi-user-id', uid);
        }
        return uid;
    }
    const USER_ID = getUserId();

    let numDisks = 4;
    let towers = [[], [], []];
    let selectedTower = null;
    let moveCount = 0;
    let timerSeconds = 0;
    let timerInterval = null;
    let timerStarted = false;
    let moveHistory = [];
    let autoSolving = false;
    let animating = false;

    const gameBoard = document.getElementById('game-board');
    const stacks = [document.getElementById('stack-0'), document.getElementById('stack-1'), document.getElementById('stack-2')];
    const towerEls = [document.getElementById('tower-0'), document.getElementById('tower-1'), document.getElementById('tower-2')];
    const moveCountEl = document.getElementById('move-count');
    const minMovesEl = document.getElementById('min-moves');
    const timerEl = document.getElementById('timer');
    const diskSelector = document.getElementById('disk-selector');
    const btnReset = document.getElementById('btn-reset');
    const btnUndo = document.getElementById('btn-undo');
    const btnHint = document.getElementById('btn-hint');
    const btnAuto = document.getElementById('btn-auto');
    const winModal = document.getElementById('win-modal');
    const winText = document.getElementById('win-text');
    const modalStars = document.getElementById('modal-stars');
    const btnPlayAgain = document.getElementById('btn-play-again');
    const confettiContainer = document.getElementById('confetti-container');

    const DISK_H = 22;
    const LIFT_Y = -40;
    const A_LIFT = 90, A_SLIDE = 120, A_DROP = 100;

    function init() {
        stopTimer(); timerStarted = false; timerSeconds = 0;
        moveCount = 0; moveHistory = []; selectedTower = null;
        autoSolving = false; animating = false;
        towers = [[], [], []];
        for (let i = numDisks; i >= 1; i--) towers[0].push(i);
        updateMinMoves(); updateMoveCount(); updateTimer();
        render(); clearSelection();
        // Dynamically size pegs to fit all disks
        requestAnimationFrame(() => {
            const sampleDisk = stacks[0].querySelector('.disk');
            const dh = sampleDisk ? sampleDisk.offsetHeight : 18;
            const needed = (numDisks * (dh + 2)) + 20;
            document.querySelectorAll('.peg').forEach(p => p.style.minHeight = needed + 'px');
        });
    }

    function render() {
        for (let t = 0; t < 3; t++) {
            stacks[t].innerHTML = '';
            towers[t].forEach((s, i) => {
                const d = document.createElement('div');
                d.classList.add('disk'); d.dataset.size = s; d.textContent = s;
                if (i === towers[t].length - 1) d.classList.add('top-disk');
                stacks[t].appendChild(d);
            });
        }
    }

    function getDH() {
        const d = stacks[0].querySelector('.disk');
        return d ? d.offsetHeight : DISK_H;
    }

    function getTowerCX(i) { const r = towerEls[i].getBoundingClientRect(); return r.left + r.width / 2; }

    function animateMove(from, to) {
        return new Promise(resolve => {
            const dh = getDH();
            const el = stacks[from].lastChild;
            if (!el) { resolve(); return; }
            const sz = parseInt(el.dataset.size);
            const dr = el.getBoundingClientRect();
            const br = gameBoard.getBoundingClientRect();
            const fly = el.cloneNode(true);
            fly.classList.add('flying-disk');
            fly.style.cssText = `position:absolute;z-index:100;left:${dr.left-br.left}px;top:${dr.top-br.top}px;width:${dr.width}px;height:${dr.height}px;margin:0;transition:none;will-change:left,top;`;
            gameBoard.appendChild(fly);
            el.style.visibility = 'hidden';

            const tx = getTowerCX(to) - br.left - dr.width / 2;
            const cnt = towers[to].length;
            const bse = towerEls[to].querySelector('.base').getBoundingClientRect();
            const ty = bse.top - br.top - (cnt + 1) * dh;
            const pt = towerEls[from].querySelector('.peg').getBoundingClientRect().top - br.top;

            requestAnimationFrame(() => {
                fly.style.transition = `top ${A_LIFT}ms cubic-bezier(0.4,0,0.2,1)`;
                fly.style.top = (pt + LIFT_Y) + 'px';
                fly.style.filter = 'brightness(1.2)';
                fly.style.boxShadow = glow(sz);
                setTimeout(() => {
                    fly.style.transition = `left ${A_SLIDE}ms cubic-bezier(0.4,0,0.2,1),top ${A_SLIDE}ms cubic-bezier(0.4,0,0.2,1)`;
                    fly.style.left = tx + 'px';
                    const tp = towerEls[to].querySelector('.peg').getBoundingClientRect().top - br.top;
                    fly.style.top = (tp + LIFT_Y) + 'px';
                    setTimeout(() => {
                        fly.style.transition = `top ${A_DROP}ms cubic-bezier(0.34,1.56,0.64,1),filter ${A_DROP}ms ease`;
                        fly.style.top = ty + 'px';
                        fly.style.filter = 'brightness(1)';
                        setTimeout(() => {
                            towers[from].pop();
                            towers[to].push(sz);
                            moveCount++;
                            updateMoveCount();
                            fly.remove();
                            render();
                            resolve();
                        }, A_DROP + 20);
                    }, A_SLIDE + 15);
                }, A_LIFT + 15);
            });
        });
    }

    const glows = {
        1:'0 5px 20px rgba(124,92,252,0.6)',2:'0 5px 20px rgba(0,212,255,0.6)',
        3:'0 5px 20px rgba(255,107,157,0.6)',4:'0 5px 20px rgba(255,217,61,0.6)',
        5:'0 5px 20px rgba(107,203,119,0.6)',6:'0 5px 20px rgba(255,142,83,0.6)',
        7:'0 5px 20px rgba(232,67,147,0.6)',8:'0 5px 20px rgba(10,189,227,0.6)',
        9:'0 5px 20px rgba(136,84,208,0.6)'
    };
    function glow(s) { return glows[s] || glows[1]; }

    function canMove(f, t) {
        if (!towers[f].length) return false;
        if (!towers[t].length) return true;
        return towers[f][towers[f].length - 1] < towers[t][towers[t].length - 1];
    }

    async function moveDisk(f, t, rec = true, anim = true) {
        if (!canMove(f, t)) return false;
        if (!timerStarted) { startTimer(); timerStarted = true; }
        if (anim) { animating = true; await animateMove(f, t); animating = false; }
        else {
            const d = towers[f].pop(); towers[t].push(d);
            moveCount++; updateMoveCount(); render();
        }
        if (rec) moveHistory.push({ from: f, to: t });
        if (towers[2].length === numDisks) setTimeout(() => showWin(), 350);
        return true;
    }

    function onTowerClick(i) {
        if (autoSolving || animating) return;
        if (selectedTower === null) {
            if (!towers[i].length) return;
            selectedTower = i;
            towerEls[i].classList.add('selected');
            const td = stacks[i].lastChild;
            if (td) td.classList.add('lifting');
            for (let j = 0; j < 3; j++) if (j !== i && canMove(i, j)) towerEls[j].classList.add('valid-target');
        } else {
            if (i === selectedTower) { clearSelection(); return; }
            if (canMove(selectedTower, i)) {
                const f = selectedTower; clearSelection(); moveDisk(f, i);
            } else {
                towerEls[i].classList.add('invalid-target');
                towerEls[i].addEventListener('animationend', () => towerEls[i].classList.remove('invalid-target'), { once: true });
            }
        }
    }

    function clearSelection() {
        selectedTower = null;
        towerEls.forEach(t => t.classList.remove('selected', 'valid-target'));
        document.querySelectorAll('.disk.lifting').forEach(d => d.classList.remove('lifting'));
    }

    async function undo() {
        if (autoSolving || animating || !moveHistory.length) return;
        const dh = getDH();
        const lm = moveHistory.pop();
        animating = true;
        const el = stacks[lm.to].lastChild;
        if (!el) { animating = false; return; }
        const dr = el.getBoundingClientRect();
        const br = gameBoard.getBoundingClientRect();
        const fly = el.cloneNode(true);
        fly.classList.add('flying-disk');
        fly.style.cssText = `position:absolute;z-index:100;left:${dr.left-br.left}px;top:${dr.top-br.top}px;width:${dr.width}px;height:${dr.height}px;margin:0;transition:none;will-change:left,top;`;
        gameBoard.appendChild(fly);
        el.style.visibility = 'hidden';

        const tx = getTowerCX(lm.from) - br.left - dr.width / 2;
        const bse = towerEls[lm.from].querySelector('.base').getBoundingClientRect();
        const ty = bse.top - br.top - (towers[lm.from].length + 1) * dh;
        const pt = towerEls[lm.to].querySelector('.peg').getBoundingClientRect().top - br.top;

        await new Promise(res => {
            requestAnimationFrame(() => {
                fly.style.transition = `top ${A_LIFT}ms cubic-bezier(0.4,0,0.2,1)`;
                fly.style.top = (pt + LIFT_Y) + 'px';
                setTimeout(() => {
                    fly.style.transition = `left ${A_SLIDE}ms cubic-bezier(0.4,0,0.2,1),top ${A_SLIDE}ms cubic-bezier(0.4,0,0.2,1)`;
                    fly.style.left = tx + 'px';
                    const tp = towerEls[lm.from].querySelector('.peg').getBoundingClientRect().top - br.top;
                    fly.style.top = (tp + LIFT_Y) + 'px';
                    setTimeout(() => {
                        fly.style.transition = `top ${A_DROP}ms cubic-bezier(0.34,1.56,0.64,1)`;
                        fly.style.top = ty + 'px';
                        setTimeout(() => {
                            const d = towers[lm.to].pop();
                            towers[lm.from].push(d);
                            moveCount--; updateMoveCount();
                            fly.remove(); render();
                            animating = false; res();
                        }, A_DROP + 20);
                    }, A_SLIDE + 15);
                }, A_LIFT + 15);
            });
        });
        clearSelection();
    }

    // --- Hint ---
    function findDisk(ts, d) { for (let t = 0; t < 3; t++) if (ts[t].includes(d)) return t; return -1; }
    function getOptimalMove(ts, n, tgt) {
        if (n === 0) return null;
        const p = findDisk(ts, n);
        if (p === tgt) return getOptimalMove(ts, n - 1, tgt);
        const aux = 3 - p - tgt;
        let ok = true;
        for (let d = n - 1; d >= 1; d--) if (findDisk(ts, d) !== aux) { ok = false; break; }
        return ok ? { from: p, to: tgt } : getOptimalMove(ts, n - 1, aux);
    }
    function showHint() {
        if (autoSolving || animating || towers[2].length === numDisks) return;
        clearSelection();
        towerEls.forEach(t => t.classList.remove('hint-source', 'hint-target'));
        const m = getOptimalMove(towers, numDisks, 2);
        if (!m) return;
        towerEls[m.from].classList.add('hint-source');
        towerEls[m.to].classList.add('hint-target');
        setTimeout(() => towerEls.forEach(t => t.classList.remove('hint-source', 'hint-target')), 1500);
    }

    // --- Timer ---
    function startTimer() { timerInterval = setInterval(() => { timerSeconds++; updateTimer(); }, 1000); }
    function stopTimer() { clearInterval(timerInterval); timerInterval = null; }
    function updateTimer() {
        timerEl.textContent = `${String(Math.floor(timerSeconds/60)).padStart(2,'0')}:${String(timerSeconds%60).padStart(2,'0')}`;
    }
    function updateMoveCount() { moveCountEl.textContent = moveCount; }
    function updateMinMoves() { minMovesEl.textContent = Math.pow(2, numDisks) - 1; }

    // --- Win ---
    function showWin() {
        stopTimer();
        const min = Math.pow(2, numDisks) - 1;
        const r = moveCount / min;
        const m = String(Math.floor(timerSeconds/60)).padStart(2,'0');
        const s = String(timerSeconds%60).padStart(2,'0');
        winText.innerHTML = `You solved it in <strong>${moveCount} moves</strong> in <strong>${m}:${s}</strong>`;
        let sc = r <= 1 ? 3 : r <= 1.5 ? 2 : 1;
        modalStars.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const st = document.createElement('span');
            st.classList.add('star');
            st.textContent = i < sc ? '⭐' : '☆';
            if (i >= sc) st.style.opacity = '0.3';
            modalStars.appendChild(st);
        }
        spawnConfetti();
        document.getElementById('win-step-1').classList.add('active');
        document.getElementById('win-step-2').classList.remove('active');
        document.getElementById('win-step-3').classList.remove('active');
        winModal.classList.add('active');
    }
    function hideWin() { winModal.classList.remove('active'); confettiContainer.innerHTML = ''; }
    function goToWinStep(step) {
        document.querySelectorAll('.win-step').forEach(s => s.classList.remove('active'));
        document.getElementById('win-step-' + step).classList.add('active');
    }
    function spawnConfetti() {
        confettiContainer.innerHTML = '';
        const cols = ['#7c5cfc','#00d4ff','#ff6b9d','#ffd93d','#6bcb77','#ff8e53'];
        for (let i = 0; i < 50; i++) {
            const p = document.createElement('div');
            p.classList.add('confetti-piece');
            p.style.background = cols[Math.floor(Math.random()*cols.length)];
            p.style.left = Math.random()*100+'%'; p.style.top = '-10px';
            p.style.animationDelay = Math.random()*1.5+'s';
            p.style.animationDuration = (2+Math.random()*2)+'s';
            confettiContainer.appendChild(p);
        }
    }

    // --- API ---
    const API = 'http://localhost:5000/api';

    // All 195 countries
    const COUNTRIES = [
        ['AF','🇦🇫','Afghanistan'],['AL','🇦🇱','Albania'],['DZ','🇩🇿','Algeria'],['AD','🇦🇩','Andorra'],['AO','🇦🇴','Angola'],
        ['AG','🇦🇬','Antigua and Barbuda'],['AR','🇦🇷','Argentina'],['AM','🇦🇲','Armenia'],['AU','🇦🇺','Australia'],['AT','🇦🇹','Austria'],
        ['AZ','🇦🇿','Azerbaijan'],['BS','🇧🇸','Bahamas'],['BH','🇧🇭','Bahrain'],['BD','🇧🇩','Bangladesh'],['BB','🇧🇧','Barbados'],
        ['BY','🇧🇾','Belarus'],['BE','🇧🇪','Belgium'],['BZ','🇧🇿','Belize'],['BJ','🇧🇯','Benin'],['BT','🇧🇹','Bhutan'],
        ['BO','🇧🇴','Bolivia'],['BA','🇧🇦','Bosnia and Herzegovina'],['BW','🇧🇼','Botswana'],['BR','🇧🇷','Brazil'],['BN','🇧🇳','Brunei'],
        ['BG','🇧🇬','Bulgaria'],['BF','🇧🇫','Burkina Faso'],['BI','🇧🇮','Burundi'],['CV','🇨🇻','Cabo Verde'],['KH','🇰🇭','Cambodia'],
        ['CM','🇨🇲','Cameroon'],['CA','🇨🇦','Canada'],['CF','🇨🇫','Central African Republic'],['TD','🇹🇩','Chad'],['CL','🇨🇱','Chile'],
        ['CN','🇨🇳','China'],['CO','🇨🇴','Colombia'],['KM','🇰🇲','Comoros'],['CG','🇨🇬','Congo'],['CD','🇨🇩','DR Congo'],
        ['CR','🇨🇷','Costa Rica'],['CI','🇨🇮','Côte d\'Ivoire'],['HR','🇭🇷','Croatia'],['CU','🇨🇺','Cuba'],['CY','🇨🇾','Cyprus'],
        ['CZ','🇨🇿','Czech Republic'],['DK','🇩🇰','Denmark'],['DJ','🇩🇯','Djibouti'],['DM','🇩🇲','Dominica'],['DO','🇩🇴','Dominican Republic'],
        ['EC','🇪🇨','Ecuador'],['EG','🇪🇬','Egypt'],['SV','🇸🇻','El Salvador'],['GQ','🇬🇶','Equatorial Guinea'],['ER','🇪🇷','Eritrea'],
        ['EE','🇪🇪','Estonia'],['SZ','🇸🇿','Eswatini'],['ET','🇪🇹','Ethiopia'],['FJ','🇫🇯','Fiji'],['FI','🇫🇮','Finland'],
        ['FR','🇫🇷','France'],['GA','🇬🇦','Gabon'],['GM','🇬🇲','Gambia'],['GE','🇬🇪','Georgia'],['DE','🇩🇪','Germany'],
        ['GH','🇬🇭','Ghana'],['GR','🇬🇷','Greece'],['GD','🇬🇩','Grenada'],['GT','🇬🇹','Guatemala'],['GN','🇬🇳','Guinea'],
        ['GW','🇬🇼','Guinea-Bissau'],['GY','🇬🇾','Guyana'],['HT','🇭🇹','Haiti'],['HN','🇭🇳','Honduras'],['HU','🇭🇺','Hungary'],
        ['IS','🇮🇸','Iceland'],['IN','🇮🇳','India'],['ID','🇮🇩','Indonesia'],['IR','🇮🇷','Iran'],['IQ','🇮🇶','Iraq'],
        ['IE','🇮🇪','Ireland'],['IL','🇮🇱','Israel'],['IT','🇮🇹','Italy'],['JM','🇯🇲','Jamaica'],['JP','🇯🇵','Japan'],
        ['JO','🇯🇴','Jordan'],['KZ','🇰🇿','Kazakhstan'],['KE','🇰🇪','Kenya'],['KI','🇰🇮','Kiribati'],['KP','🇰🇵','North Korea'],
        ['KR','🇰🇷','South Korea'],['KW','🇰🇼','Kuwait'],['KG','🇰🇬','Kyrgyzstan'],['LA','🇱🇦','Laos'],['LV','🇱🇻','Latvia'],
        ['LB','🇱🇧','Lebanon'],['LS','🇱🇸','Lesotho'],['LR','🇱🇷','Liberia'],['LY','🇱🇾','Libya'],['LI','🇱🇮','Liechtenstein'],
        ['LT','🇱🇹','Lithuania'],['LU','🇱🇺','Luxembourg'],['MG','🇲🇬','Madagascar'],['MW','🇲🇼','Malawi'],['MY','🇲🇾','Malaysia'],
        ['MV','🇲🇻','Maldives'],['ML','🇲🇱','Mali'],['MT','🇲🇹','Malta'],['MH','🇲🇭','Marshall Islands'],['MR','🇲🇷','Mauritania'],
        ['MU','🇲🇺','Mauritius'],['MX','🇲🇽','Mexico'],['FM','🇫🇲','Micronesia'],['MD','🇲🇩','Moldova'],['MC','🇲🇨','Monaco'],
        ['MN','🇲🇳','Mongolia'],['ME','🇲🇪','Montenegro'],['MA','🇲🇦','Morocco'],['MZ','🇲🇿','Mozambique'],['MM','🇲🇲','Myanmar'],
        ['NA','🇳🇦','Namibia'],['NR','🇳🇷','Nauru'],['NP','🇳🇵','Nepal'],['NL','🇳🇱','Netherlands'],['NZ','🇳🇿','New Zealand'],
        ['NI','🇳🇮','Nicaragua'],['NE','🇳🇪','Niger'],['NG','🇳🇬','Nigeria'],['MK','🇲🇰','North Macedonia'],['NO','🇳🇴','Norway'],
        ['OM','🇴🇲','Oman'],['PK','🇵🇰','Pakistan'],['PW','🇵🇼','Palau'],['PS','🇵🇸','Palestine'],['PA','🇵🇦','Panama'],
        ['PG','🇵🇬','Papua New Guinea'],['PY','🇵🇾','Paraguay'],['PE','🇵🇪','Peru'],['PH','🇵🇭','Philippines'],['PL','🇵🇱','Poland'],
        ['PT','🇵🇹','Portugal'],['QA','🇶🇦','Qatar'],['RO','🇷🇴','Romania'],['RU','🇷🇺','Russia'],['RW','🇷🇼','Rwanda'],
        ['KN','🇰🇳','Saint Kitts and Nevis'],['LC','🇱🇨','Saint Lucia'],['VC','🇻🇨','Saint Vincent'],['WS','🇼🇸','Samoa'],['SM','🇸🇲','San Marino'],
        ['ST','🇸🇹','São Tomé and Príncipe'],['SA','🇸🇦','Saudi Arabia'],['SN','🇸🇳','Senegal'],['RS','🇷🇸','Serbia'],['SC','🇸🇨','Seychelles'],
        ['SL','🇸🇱','Sierra Leone'],['SG','🇸🇬','Singapore'],['SK','🇸🇰','Slovakia'],['SI','🇸🇮','Slovenia'],['SB','🇸🇧','Solomon Islands'],
        ['SO','🇸🇴','Somalia'],['ZA','🇿🇦','South Africa'],['SS','🇸🇸','South Sudan'],['ES','🇪🇸','Spain'],['LK','🇱🇰','Sri Lanka'],
        ['SD','🇸🇩','Sudan'],['SR','🇸🇷','Suriname'],['SE','🇸🇪','Sweden'],['CH','🇨🇭','Switzerland'],['SY','🇸🇾','Syria'],
        ['TW','🇹🇼','Taiwan'],['TJ','🇹🇯','Tajikistan'],['TZ','🇹🇿','Tanzania'],['TH','🇹🇭','Thailand'],['TL','🇹🇱','Timor-Leste'],
        ['TG','🇹🇬','Togo'],['TO','🇹🇴','Tonga'],['TT','🇹🇹','Trinidad and Tobago'],['TN','🇹🇳','Tunisia'],['TR','🇹🇷','Turkey'],
        ['TM','🇹🇲','Turkmenistan'],['TV','🇹🇻','Tuvalu'],['UG','🇺🇬','Uganda'],['UA','🇺🇦','Ukraine'],['AE','🇦🇪','UAE'],
        ['GB','🇬🇧','United Kingdom'],['US','🇺🇸','United States'],['UY','🇺🇾','Uruguay'],['UZ','🇺🇿','Uzbekistan'],['VU','🇻🇺','Vanuatu'],
        ['VA','🇻🇦','Vatican City'],['VE','🇻🇪','Venezuela'],['VN','🇻🇳','Vietnam'],['YE','🇾🇪','Yemen'],['ZM','🇿🇲','Zambia'],['ZW','🇿🇼','Zimbabwe']
    ];
    const FLAGS = {}; COUNTRIES.forEach(c => FLAGS[c[0]] = c[1]);

    function fmtTime(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

    async function submitScore() {
        const name = document.getElementById('player-name').value.trim();
        const country = document.getElementById('player-country').value;
        if (!name || !country) { showToast('Please fill in all fields'); return; }
        // Save name & country for next time
        localStorage.setItem('hanoi-player-name', name);
        localStorage.setItem('hanoi-player-country', country);
        try {
            const res = await fetch(API + '/score', { method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ user_id: USER_ID, name, country, moves: moveCount, time_seconds: timerSeconds, num_disks: numDisks }) });
            const data = await res.json();
            if (data.rank) showToast(`🎉 You're ranked #${data.rank}!`);
            else if (data.updated === false) showToast(data.message || 'Score submitted!');
            else showToast('Score submitted!');
        } catch (e) { showToast('Server offline — score not saved'); }
        goToWinStep(3);
    }

    // --- Leaderboard ---
    const lbModal = document.getElementById('lb-modal');
    const lbBody = document.getElementById('lb-body');
    const lbTabs = document.getElementById('lb-tabs');
    let lbDiskFilter = 4;
    function initLbTabs() {
        lbTabs.innerHTML = '';
        for (let d = 3; d <= 9; d++) {
            const btn = document.createElement('button');
            btn.classList.add('lb-tab'); if (d === lbDiskFilter) btn.classList.add('active');
            btn.textContent = d + ' disks';
            btn.addEventListener('click', () => { lbDiskFilter = d; initLbTabs(); loadLeaderboard(); });
            lbTabs.appendChild(btn);
        }
    }
    async function loadLeaderboard() {
        lbBody.innerHTML = '<tr><td colspan="4" class="lb-empty">Loading...</td></tr>';
        try {
            const res = await fetch(API + '/leaderboard?disks=' + lbDiskFilter + '&user_id=' + encodeURIComponent(USER_ID));
            const data = await res.json();
            if (!data.length) { lbBody.innerHTML = '<tr><td colspan="4" class="lb-empty">No scores yet. Be the first! 🏆</td></tr>'; return; }
            lbBody.innerHTML = data.map(e => {
                const cls = e.is_you ? ' class="you-row"' : '';
                const youBadge = e.is_you ? ' <span class="you-badge">YOU</span>' : '';
                return `<tr${cls}><td>${e.rank}</td><td><div class="player-cell"><span class="flag">${FLAGS[e.country]||'🌍'}</span>${e.name}${youBadge}</div></td><td>${e.moves}</td><td>${fmtTime(e.time)}</td></tr>`;
            }).join('');
        } catch (e) { lbBody.innerHTML = '<tr><td colspan="4" class="lb-empty">Server offline</td></tr>'; }
    }
    function openLeaderboard() { lbDiskFilter = numDisks; initLbTabs(); loadLeaderboard(); lbModal.classList.add('active'); }
    function closeLeaderboard() { lbModal.classList.remove('active'); }

    // --- Social Sharing ---
    function getShareText() { return `🗼 I solved Tower of Hanoi (${numDisks} disks) in ${moveCount} moves in ${fmtTime(timerSeconds)}! Can you beat me? 🏆`; }

    // --- Toast ---
    function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

    // --- Auto Solve ---
    async function autoSolve() {
        if (autoSolving) return;
        autoSolving = true;
        stopTimer(); timerStarted = false; timerSeconds = 0;
        moveCount = 0; moveHistory = []; selectedTower = null;
        towers = [[], [], []];
        for (let i = numDisks; i >= 1; i--) towers[0].push(i);
        updateMoveCount(); updateTimer(); render(); clearSelection();
        await sleep(300);
        const mv = []; genMoves(numDisks, 0, 2, 1, mv);
        for (const m of mv) { if (!autoSolving) break; await moveDisk(m.from, m.to, false, true); await sleep(60); }
        autoSolving = false;
    }
    function genMoves(n, f, t, a, mv) { if (!n) return; genMoves(n-1, f, a, t, mv); mv.push({from:f,to:t}); genMoves(n-1, a, t, f, mv); }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function setNumDisks(n) {
        numDisks = n;
        diskSelector.querySelectorAll('.disk-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.disks) === n));
        init();
    }

    // --- Events ---
    towerEls.forEach((el, i) => el.addEventListener('click', () => onTowerClick(i)));
    diskSelector.addEventListener('click', e => { if (e.target.classList.contains('disk-btn')) setNumDisks(parseInt(e.target.dataset.disks)); });
    btnReset.addEventListener('click', () => { autoSolving = false; init(); });
    btnUndo.addEventListener('click', undo);
    btnHint.addEventListener('click', showHint);
    btnAuto.addEventListener('click', autoSolve);
    btnPlayAgain.addEventListener('click', () => { hideWin(); init(); });
    winModal.addEventListener('click', e => { if (e.target === winModal) { hideWin(); init(); } });

    // Win flow
    document.getElementById('btn-to-step2').addEventListener('click', () => goToWinStep(2));
    document.getElementById('btn-skip-submit').addEventListener('click', () => goToWinStep(3));
    document.getElementById('btn-submit-score').addEventListener('click', submitScore);
    document.getElementById('btn-skip-info').addEventListener('click', () => goToWinStep(3));
    document.getElementById('btn-view-lb').addEventListener('click', () => { hideWin(); openLeaderboard(); });

    // Leaderboard
    document.getElementById('btn-leaderboard').addEventListener('click', openLeaderboard);
    document.getElementById('lb-close').addEventListener('click', closeLeaderboard);
    lbModal.addEventListener('click', e => { if (e.target === lbModal) closeLeaderboard(); });

    // Social sharing
    document.getElementById('share-wa').addEventListener('click', () => { window.open('https://wa.me/?text=' + encodeURIComponent(getShareText()), '_blank'); });
    document.getElementById('share-tg').addEventListener('click', () => { window.open('https://t.me/share/url?url=Tower+of+Hanoi&text=' + encodeURIComponent(getShareText()), '_blank'); });
    document.getElementById('share-fb').addEventListener('click', () => { window.open('https://www.facebook.com/sharer/sharer.php?quote=' + encodeURIComponent(getShareText()), '_blank'); });
    document.getElementById('share-x').addEventListener('click', () => { window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(getShareText()), '_blank'); });
    document.getElementById('share-ig').addEventListener('click', () => { navigator.clipboard.writeText(getShareText()).then(() => showToast('📋 Copied! Paste in Instagram')); });

    // Pre-fill saved name & country for returning users
    const savedName = localStorage.getItem('hanoi-player-name');
    const savedCountry = localStorage.getItem('hanoi-player-country');
    if (savedName) {
        const nameEl = document.getElementById('player-name');
        if (nameEl) nameEl.value = savedName;
    }

    init();
})();

// ===== Theme Toggle =====
(function() {
    const toggle = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('hanoi-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    toggle.textContent = saved === 'dark' ? '🌙' : '☀️';

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('hanoi-theme', next);
        toggle.textContent = next === 'dark' ? '🌙' : '☀️';
    });
})();

// ===== Searchable Country Picker =====
(function() {
    const search = document.getElementById('country-search');
    const list = document.getElementById('country-list');
    const hidden = document.getElementById('player-country');
    const COUNTRIES = [
        ['AF','🇦🇫','Afghanistan'],['AL','🇦🇱','Albania'],['DZ','🇩🇿','Algeria'],['AD','🇦🇩','Andorra'],['AO','🇦🇴','Angola'],
        ['AG','🇦🇬','Antigua and Barbuda'],['AR','🇦🇷','Argentina'],['AM','🇦🇲','Armenia'],['AU','🇦🇺','Australia'],['AT','🇦🇹','Austria'],
        ['AZ','🇦🇿','Azerbaijan'],['BS','🇧🇸','Bahamas'],['BH','🇧🇭','Bahrain'],['BD','🇧🇩','Bangladesh'],['BB','🇧🇧','Barbados'],
        ['BY','🇧🇾','Belarus'],['BE','🇧🇪','Belgium'],['BZ','🇧🇿','Belize'],['BJ','🇧🇯','Benin'],['BT','🇧🇹','Bhutan'],
        ['BO','🇧🇴','Bolivia'],['BA','🇧🇦','Bosnia and Herzegovina'],['BW','🇧🇼','Botswana'],['BR','🇧🇷','Brazil'],['BN','🇧🇳','Brunei'],
        ['BG','🇧🇬','Bulgaria'],['BF','🇧🇫','Burkina Faso'],['BI','🇧🇮','Burundi'],['CV','🇨🇻','Cabo Verde'],['KH','🇰🇭','Cambodia'],
        ['CM','🇨🇲','Cameroon'],['CA','🇨🇦','Canada'],['CF','🇨🇫','Central African Republic'],['TD','🇹🇩','Chad'],['CL','🇨🇱','Chile'],
        ['CN','🇨🇳','China'],['CO','🇨🇴','Colombia'],['KM','🇰🇲','Comoros'],['CG','🇨🇬','Congo'],['CD','🇨🇩','DR Congo'],
        ['CR','🇨🇷','Costa Rica'],['CI','🇨🇮','Côte d\'Ivoire'],['HR','🇭🇷','Croatia'],['CU','🇨🇺','Cuba'],['CY','🇨🇾','Cyprus'],
        ['CZ','🇨🇿','Czech Republic'],['DK','🇩🇰','Denmark'],['DJ','🇩🇯','Djibouti'],['DM','🇩🇲','Dominica'],['DO','🇩🇴','Dominican Republic'],
        ['EC','🇪🇨','Ecuador'],['EG','🇪🇬','Egypt'],['SV','🇸🇻','El Salvador'],['GQ','🇬🇶','Equatorial Guinea'],['ER','🇪🇷','Eritrea'],
        ['EE','🇪🇪','Estonia'],['SZ','🇸🇿','Eswatini'],['ET','🇪🇹','Ethiopia'],['FJ','🇫🇯','Fiji'],['FI','🇫🇮','Finland'],
        ['FR','🇫🇷','France'],['GA','🇬🇦','Gabon'],['GM','🇬🇲','Gambia'],['GE','🇬🇪','Georgia'],['DE','🇩🇪','Germany'],
        ['GH','🇬🇭','Ghana'],['GR','🇬🇷','Greece'],['GD','🇬🇩','Grenada'],['GT','🇬🇹','Guatemala'],['GN','🇬🇳','Guinea'],
        ['GW','🇬🇼','Guinea-Bissau'],['GY','🇬🇾','Guyana'],['HT','🇭🇹','Haiti'],['HN','🇭🇳','Honduras'],['HU','🇭🇺','Hungary'],
        ['IS','🇮🇸','Iceland'],['IN','🇮🇳','India'],['ID','🇮🇩','Indonesia'],['IR','🇮🇷','Iran'],['IQ','🇮🇶','Iraq'],
        ['IE','🇮🇪','Ireland'],['IL','🇮🇱','Israel'],['IT','🇮🇹','Italy'],['JM','🇯🇲','Jamaica'],['JP','🇯🇵','Japan'],
        ['JO','🇯🇴','Jordan'],['KZ','🇰🇿','Kazakhstan'],['KE','🇰🇪','Kenya'],['KI','🇰🇮','Kiribati'],['KP','🇰🇵','North Korea'],
        ['KR','🇰🇷','South Korea'],['KW','🇰🇼','Kuwait'],['KG','🇰🇬','Kyrgyzstan'],['LA','🇱🇦','Laos'],['LV','🇱🇻','Latvia'],
        ['LB','🇱🇧','Lebanon'],['LS','🇱🇸','Lesotho'],['LR','🇱🇷','Liberia'],['LY','🇱🇾','Libya'],['LI','🇱🇮','Liechtenstein'],
        ['LT','🇱🇹','Lithuania'],['LU','🇱🇺','Luxembourg'],['MG','🇲🇬','Madagascar'],['MW','🇲🇼','Malawi'],['MY','🇲🇾','Malaysia'],
        ['MV','🇲🇻','Maldives'],['ML','🇲🇱','Mali'],['MT','🇲🇹','Malta'],['MH','🇲🇭','Marshall Islands'],['MR','🇲🇷','Mauritania'],
        ['MU','🇲🇺','Mauritius'],['MX','🇲🇽','Mexico'],['FM','🇫🇲','Micronesia'],['MD','🇲🇩','Moldova'],['MC','🇲🇨','Monaco'],
        ['MN','🇲🇳','Mongolia'],['ME','🇲🇪','Montenegro'],['MA','🇲🇦','Morocco'],['MZ','🇲🇿','Mozambique'],['MM','🇲🇲','Myanmar'],
        ['NA','🇳🇦','Namibia'],['NR','🇳🇷','Nauru'],['NP','🇳🇵','Nepal'],['NL','🇳🇱','Netherlands'],['NZ','🇳🇿','New Zealand'],
        ['NI','🇳🇮','Nicaragua'],['NE','🇳🇪','Niger'],['NG','🇳🇬','Nigeria'],['MK','🇲🇰','North Macedonia'],['NO','🇳🇴','Norway'],
        ['OM','🇴🇲','Oman'],['PK','🇵🇰','Pakistan'],['PW','🇵🇼','Palau'],['PS','🇵🇸','Palestine'],['PA','🇵🇦','Panama'],
        ['PG','🇵🇬','Papua New Guinea'],['PY','🇵🇾','Paraguay'],['PE','🇵🇪','Peru'],['PH','🇵🇭','Philippines'],['PL','🇵🇱','Poland'],
        ['PT','🇵🇹','Portugal'],['QA','🇶🇦','Qatar'],['RO','🇷🇴','Romania'],['RU','🇷🇺','Russia'],['RW','🇷🇼','Rwanda'],
        ['KN','🇰🇳','Saint Kitts and Nevis'],['LC','🇱🇨','Saint Lucia'],['VC','🇻🇨','Saint Vincent'],['WS','🇼🇸','Samoa'],['SM','🇸🇲','San Marino'],
        ['ST','🇸🇹','São Tomé and Príncipe'],['SA','🇸🇦','Saudi Arabia'],['SN','🇸🇳','Senegal'],['RS','🇷🇸','Serbia'],['SC','🇸🇨','Seychelles'],
        ['SL','🇸🇱','Sierra Leone'],['SG','🇸🇬','Singapore'],['SK','🇸🇰','Slovakia'],['SI','🇸🇮','Slovenia'],['SB','🇸🇧','Solomon Islands'],
        ['SO','🇸🇴','Somalia'],['ZA','🇿🇦','South Africa'],['SS','🇸🇸','South Sudan'],['ES','🇪🇸','Spain'],['LK','🇱🇰','Sri Lanka'],
        ['SD','🇸🇩','Sudan'],['SR','🇸🇷','Suriname'],['SE','🇸🇪','Sweden'],['CH','🇨🇭','Switzerland'],['SY','🇸🇾','Syria'],
        ['TW','🇹🇼','Taiwan'],['TJ','🇹🇯','Tajikistan'],['TZ','🇹🇿','Tanzania'],['TH','🇹🇭','Thailand'],['TL','🇹🇱','Timor-Leste'],
        ['TG','🇹🇬','Togo'],['TO','🇹🇴','Tonga'],['TT','🇹🇹','Trinidad and Tobago'],['TN','🇹🇳','Tunisia'],['TR','🇹🇷','Turkey'],
        ['TM','🇹🇲','Turkmenistan'],['TV','🇹🇻','Tuvalu'],['UG','🇺🇬','Uganda'],['UA','🇺🇦','Ukraine'],['AE','🇦🇪','UAE'],
        ['GB','🇬🇧','United Kingdom'],['US','🇺🇸','United States'],['UY','🇺🇾','Uruguay'],['UZ','🇺🇿','Uzbekistan'],['VU','🇻🇺','Vanuatu'],
        ['VA','🇻🇦','Vatican City'],['VE','🇻🇪','Venezuela'],['VN','🇻🇳','Vietnam'],['YE','🇾🇪','Yemen'],['ZM','🇿🇲','Zambia'],['ZW','🇿🇼','Zimbabwe']
    ];

    function renderList(filter) {
        const q = (filter || '').toLowerCase();
        const matches = q ? COUNTRIES.filter(c => c[2].toLowerCase().includes(q)) : COUNTRIES;
        if (!matches.length) {
            list.innerHTML = '<div class="no-results">No countries found</div>';
        } else {
            list.innerHTML = matches.map(c =>
                `<div class="country-item" data-code="${c[0]}" data-flag="${c[1]}" data-name="${c[2]}"><span class="country-flag">${c[1]}</span>${c[2]}</div>`
            ).join('');
        }
    }

    search.addEventListener('focus', () => { renderList(search.value); list.classList.add('open'); });
    search.addEventListener('input', () => { renderList(search.value); list.classList.add('open'); });

    list.addEventListener('click', e => {
        const item = e.target.closest('.country-item');
        if (!item) return;
        hidden.value = item.dataset.code;
        search.value = item.dataset.flag + ' ' + item.dataset.name;
        list.classList.remove('open');
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('#country-picker')) list.classList.remove('open');
    });
})();

// ===== Cookie Consent =====
(function() {
    const banner = document.getElementById('cookie-banner');
    if (!localStorage.getItem('cookie-consent')) {
        setTimeout(() => banner.classList.add('show'), 1500);
    }
    document.getElementById('cookie-accept').addEventListener('click', () => {
        localStorage.setItem('cookie-consent', 'accepted');
        banner.classList.remove('show');
    });
    document.getElementById('cookie-decline').addEventListener('click', () => {
        localStorage.setItem('cookie-consent', 'declined');
        banner.classList.remove('show');
    });
})();