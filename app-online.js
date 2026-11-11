import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const subjects=['جاوي & خط','ادب & اخلاق اسلاميه','تلاوة القرءان','عقيدة','عبادة','اللغة العربية','سيره'];
// Slip order from original Excel: D,F,H,J,L,N,P are displayed in reverse subject order.
const map=[5,6,0,1,2,3,4];
const initial=window.INITIAL_DATA;let db={meta:{...initial.meta},students:[]};let client=null;let user=null;let currentSchool=null;let profile=null;let currentClass=null;let classRows=[];
const $=s=>document.querySelector(s);const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function grade(v){if(v===''||v===null||String(v).toUpperCase()==='TH')return 'TH';let n=Number(v);return n>=80?'A':n>=60?'B':n>=40?'C':n>=20?'D':'E'}
function total(st){return st.marks.reduce((sum,v)=>sum+(typeof v==='number'?v:0),0)}
function percent(st){let count=st.marks.filter(v=>typeof v==='number').length;return count?total(st)/7:null}
function rank(st){let p=percent(st);return p===null?'—':1+db.students.filter(x=>percent(x)!==null&&total(x)>total(st)).length}
function persist(){}
function opts(sel){let value=sel.value;sel.innerHTML=db.students.map((s,i)=>`<option value="${i}">${escapeHTML(s.name)}</option>`).join('');sel.value=value&&Number(value)<db.students.length?value:'0'}
function commentOptions(st){const sel=$('#commentChoice');const choices=[...window.KAFA_ULASAN];if(st.comment&&!choices.includes(st.comment))choices.push(st.comment);sel.innerHTML='<option value="">— Pilih ulasan —</option>'+choices.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');sel.value=st.comment||''}
// Ruangan Kedatangan di bawah Ulasan Guru Kelas (tanpa perlu mengubah index.html).
function ensureAttendanceInput(){
  let el=document.querySelector('#attendanceInput');
  if(el)return el;
  const comment=document.querySelector('#commentChoice');
  if(!comment)return null;
  const field=document.createElement('label');
  field.id='attendanceField';
  field.style.cssText='display:block;margin-top:14px;max-width:650px;font-weight:600';
  field.innerHTML='<span>Kedatangan Murid</span><input id="attendanceInput" type="text" maxlength="40" placeholder="Contoh: 180/200" autocomplete="off" style="display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #b9cde5;border-radius:8px;font:inherit;font-weight:400">';
  const parent=comment.closest('label');
  (parent && parent.contains(comment) ? parent : comment).insertAdjacentElement('afterend',field);
  return field.querySelector('input');
}
function loadStudent(){let st=db.students[Number($('#student').value)];if(!st){$('#markInputs').innerHTML='';$('#summary').innerHTML='';const attendance=ensureAttendanceInput();if(attendance)attendance.value='';return;}$('#name').value=st.name;commentOptions(st);const attendance=ensureAttendanceInput();if(attendance)attendance.value=st.attendance||'';$('#markInputs').innerHTML=`<div class="marks-table-head"><span>Bil.</span><span>Mata Pelajaran</span><span>Markah (0 – 100 atau TH)</span><span>Gred</span></div>`+subjects.map((sub,i)=>`<div class="markrow"><span class="mark-number">${i+1}</span><span class="subject-name" lang="ar">${sub}</span><input aria-label="Markah ${i+1}" class="mark" data-index="${map[i]}" value="${escapeHTML(st.marks[map[i]])}" placeholder="0–100 atau TH"><output class="grade-pill">${grade(st.marks[map[i]])}</output></div>`).join('');$('#summary').innerHTML=`<div class="summary"><span><b>▥ &nbsp; Jumlah:</b> ${total(st)} / 700</span><span><b>Peratus:</b> ${percent(st)===null?'TH':percent(st).toFixed(2)+'%'}</span><span><b>Kedudukan:</b> ${rank(st)} / ${db.students.length}</span></div>`}
async function saveStudent(){let st=db.students[Number($('#student').value)];if(!st)return;let vals=[];for(let el of document.querySelectorAll('.mark')){let raw=el.value.trim().toUpperCase();if(raw===''||raw==='TH')vals[Number(el.dataset.index)]='TH';else if(!isNaN(Number(raw))&&Number(raw)>=0&&Number(raw)<=100)vals[Number(el.dataset.index)]=Number(raw);else return alert('Markah mesti 0 hingga 100 atau TH.')}st.name=$('#name').value.trim()||st.name;st.marks=vals;st.comment=$('#commentChoice').value;st.attendance=($('#attendanceInput')?.value||'').trim();try{await saveStudentRemote(st);refresh();alert('Markah, ulasan dan kedatangan berjaya disimpan dalam Supabase.')}catch(err){alert('Gagal menyimpan: '+err.message)}}
function slip(st){let pct=percent(st);return `<article class="slip"><div class="excel-content"><div class="slip-head"><img class="crest" src="logo.jpg" alt="Logo Sekolah Kebangsaan Utan Aji"><div class="jawi">لافورن كماجوان موريد كلس كافا</div><h3 style="margin-top:0;margin-bottom:5mm">LAPORAN KEMAJUAN MURID KELAS KAFA</h3><h2>${escapeHTML(db.meta.exam)}</h2></div><div class="info-excel"><div class="info-side info-left"><div class="info-detail"><span class="detail-value">${escapeHTML(db.meta.class)}</span><span class="detail-label"><span class="label-colon">:</span><span dir="rtl">درجه</span></span></div><div class="info-detail"><span class="detail-value">${escapeHTML(db.meta.year)}</span><span class="detail-label"><span class="label-colon">:</span><span dir="rtl">تاهون</span></span></div></div><div class="info-side info-right"><div class="info-detail"><span class="detail-value">${escapeHTML(st.name)}</span><span class="detail-label"><span class="label-colon">:</span><span dir="rtl">نام موريد</span></span></div><div class="info-detail"><span class="detail-value">${escapeHTML(db.meta.school)}</span><span class="detail-label"><span class="label-colon">:</span><span dir="rtl">سكوله</span></span></div></div></div><table class="excel-table"><thead><tr><th class="col-bil">بيل</th><th class="col-sub">فركارا / مات فلاجرن</th><th class="col-mark">مركه</th><th class="col-grade">ݢريد</th></tr></thead><tbody>${subjects.map((sub,i)=>`<tr><td>${i+1}</td><td class="subject">${sub.replace(/&/g,'<span class="amp-normal">&amp;</span>')}</td><td>${st.marks[map[i]]}</td><td>${grade(st.marks[map[i]])}</td></tr>`).join('')}</tbody></table><div class="excel-bottom"><div class="excel-stat-grid"><div class="stat-left"><div class="stat-row"><span class="stat-val">${pct===null?'TH':pct.toFixed(2)+'%'}</span><span class="stat-label"><span class="label-colon">:</span><span dir="rtl">فراتوس</span></span></div><div class="stat-row"><span class="stat-val">${escapeHTML(st.attendance||'—')}</span><span class="stat-label"><span class="label-colon">:</span><span dir="rtl">كداتاغن</span></span></div></div><div class="stat-right"><div class="stat-row"><span class="stat-val">${total(st)} /700</span><span class="stat-label"><span class="label-colon">:</span><span dir="rtl">جومله مركه كسلوروهن</span></span></div><div class="stat-row"><span class="stat-val">${rank(st)} /${db.students.length}</span><span class="stat-label"><span class="label-colon">:</span><span dir="rtl">كدودوقن دالم كلس</span></span></div></div></div><div class="excel-comment"><div class="comment-label"><span class="label-colon">:</span><span dir="rtl">اولسن ݢورو كلس</span></div><div class="comment-text">${escapeHTML(st.comment||'')}</div></div><div class="excel-signatures"><div class="sig sig-parent"><div>تندا تاغن ايبو باف / فنجاݢ</div><div class="sig-date"><span class="label-colon">:</span><span dir="rtl">تاريخ</span></div><div class="sig-line"></div></div><div class="sig sig-head"><div>تنداتاڠن ݢورو بسر</div><div class="sig-date"><span class="label-colon">:</span><span dir="rtl">تاريخ</span></div><div class="sig-line"></div></div><div class="sig sig-teacher"><div>تندا تاغن ݢورو كلس</div><div class="sig-date"><span class="label-colon">:</span><span dir="rtl">تاريخ</span></div><div class="sig-line"></div></div></div></article>`}
function preview(all){let i=Number($('#slipStudent').value)||0;$('#preview').innerHTML=(all?db.students:(db.students[i]?[db.students[i]]:[])).map(slip).join('')}
function refresh(){opts($('#student'));opts($('#slipStudent'));loadStudent();preview(false)}
function initMeta(){let labels={school:'Nama Sekolah',address:'Alamat',class:'Kelas',teacher:'Nama Guru',exam:'Nama Peperiksaan',year:'Tahun'};$('#metaInputs').innerHTML=Object.entries(labels).map(([key,label])=>`<label>${label}<input data-meta="${key}" value="${escapeHTML(db.meta[key])}"></label>`).join('')}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.panel').forEach(x=>x.classList.add('hidden'));$('#'+b.dataset.tab).classList.remove('hidden');if(b.dataset.tab==='slips')preview(false)});

// Popup tambah murid khusus sistem (menggantikan prompt pelayar).
function bukaPopupTambahMurid(){
  return new Promise(resolve=>{
    const modal=document.querySelector('#tambahMuridModal');
    const input=document.querySelector('#namaMuridBaharu');
    const form=document.querySelector('#tambahMuridForm');
    const batal=document.querySelector('#batalTambahMurid');
    const sebelumnya=document.activeElement;
    let selesai=false;
    const tutup=(nama)=>{
      if(selesai)return;
      selesai=true;
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden','true');
      form.removeEventListener('submit',simpan);
      batal.removeEventListener('click',batalkan);
      modal.removeEventListener('click',luar);
      document.removeEventListener('keydown',kekunci);
      sebelumnya?.focus?.();
      resolve(nama);
    };
    const simpan=e=>{e.preventDefault();const nama=input.value.trim();if(!nama){input.focus();return;}tutup(nama)};
    const batalkan=()=>tutup(null);
    const luar=e=>{if(e.target===modal)tutup(null)};
    const kekunci=e=>{if(e.key==='Escape'){e.preventDefault();tutup(null)}};
    input.value='';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    form.addEventListener('submit',simpan);
    batal.addEventListener('click',batalkan);
    modal.addEventListener('click',luar);
    document.addEventListener('keydown',kekunci);
    input.focus();
  });
}

$('#student').onchange=loadStudent;$('#slipStudent').onchange=()=>preview(false);$('#save').onclick=saveStudent;$('#add').onclick=async()=>{let name=await bukaPopupTambahMurid();if(!name?.trim())return;try{let st=await addStudentRemote(name.trim());db.students.push(st);refresh();$('#student').value=String(db.students.length-1);loadStudent()}catch(err){alert('Gagal tambah murid: '+err.message)}};$('#saveMeta').onclick=async()=>{const updated={...db.meta};document.querySelectorAll('[data-meta]').forEach(e=>updated[e.dataset.meta]=e.value);try{if(currentClass){const className=classRows.find(c=>c.id===currentClass)?.name;if(className)updated.class=className;}await saveMetaRemote(updated);db.meta=updated;preview(false);alert('Maklumat disimpan dalam Supabase.')}catch(err){alert('Gagal simpan: '+err.message)}};$('#printOne').onclick=()=>{preview(false);window.print()};$('#printAll').onclick=()=>{preview(true);window.print()};

async function saveStudentRemote(st){const {error}=await client.from('kafa_students').update({name:st.name,marks:st.marks,comment:st.comment,attendance:st.attendance||''}).eq('id',st.id).eq('school_id',currentSchool).eq('class_id',currentClass);if(error)throw error}
async function addStudentRemote(name){const {data,error}=await client.from('kafa_students').insert({school_id:currentSchool,class_id:currentClass,name,marks:Array(7).fill('TH'),comment:'',attendance:''}).select('id,name,marks,comment,attendance').single();if(error)throw error;return data}
async function saveMetaRemote(meta){if(!profile||!currentSchool)throw new Error('Profil sekolah tidak tersedia');const {data:original,error:readError}=await client.from('kafa_schools').select('meta').eq('id',currentSchool).single();if(readError)throw readError;const {data,error}=await client.from('kafa_schools').update({meta:{...meta,class:original.meta?.class}}).eq('id',currentSchool).select('id,meta').single();if(error)throw new Error(error.message+' — Semak polisi UPDATE Supabase bagi guru sekolah ini.');if(!data)throw new Error('Tiada rekod dikemas kini. Semak polisi RLS Supabase.')}
async function loadRemote(){
 const {data:prof,error:pe}=await client.from('kafa_profiles').select('school_id,role,class_id').eq('user_id',user.id).single();
 if(pe)throw new Error('Akaun belum didaftarkan oleh pentadbir: '+pe.message);
 profile=prof;currentSchool=prof.school_id;
 const admin=String(profile.role||'').toLowerCase()==='admin';
 const [{data:school,error:se},{data:classes,error:ce}]=await Promise.all([
  client.from('kafa_schools').select('meta').eq('id',currentSchool).single(),
  client.from('kafa_classes').select('id,name').eq('school_id',currentSchool).order('name')
 ]);
 if(se||ce)throw se||ce;
 classRows=classes||[];
 currentClass=admin?(currentClass&&classRows.some(c=>c.id===currentClass)?currentClass:(classRows[0]?.id||null)):profile.class_id;
 if(!admin&&!currentClass)throw new Error('Pentadbir belum menetapkan kelas untuk akaun guru ini.');
 await loadClassStudents(school.meta);
 const adminNav=$('#adminNav');if(adminNav)adminNav.classList.toggle('hidden',!admin);
 const adminPanel=$('#admin');if(adminPanel)adminPanel.classList.toggle('hidden',true);
 if(admin)await loadAdmin();
}
async function loadClassStudents(schoolMeta){
 let query=client.from('kafa_students').select('id,name,marks,comment,attendance').eq('school_id',currentSchool).order('name');
 if(currentClass)query=query.eq('class_id',currentClass);else query=query.is('class_id',null).eq('id','00000000-0000-0000-0000-000000000000');
 const {data:students,error:te}=await query;if(te)throw te;
 const chosen=classRows.find(c=>c.id===currentClass);
 db={meta:{...initial.meta,...schoolMeta,...(chosen?{class:chosen.name}:{})},students:students||[]};
 initMeta();const classInput=document.querySelector('[data-meta="class"]');if(classInput){classInput.readOnly=true;classInput.title='Kelas ditetapkan oleh pentadbir';}
 document.querySelectorAll('[data-meta]').forEach(e=>{if(e!==classInput){e.disabled=false;e.readOnly=false}});
 $('#saveMeta').disabled=false;
 $('#add').disabled=!currentClass;$('#save').disabled=!currentClass;
 refresh();
}
async function loadAdmin(){
 if(String(profile?.role||'').toLowerCase()!=='admin')return;
 const [{data:teachers,error:pe},{data:unassigned,error:ue}]=await Promise.all([
  client.rpc('kafa_admin_list_teachers'),
  client.from('kafa_students').select('id,name').eq('school_id',currentSchool).is('class_id',null).order('name')
 ]);
 if(pe||ue)throw pe||ue;
 const teacherRows=teachers||[];
 $('#adminClassSelect').innerHTML=classRows.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join('');
 $('#adminTeacher').innerHTML=teacherRows.map(t=>`<option value="${escapeHTML(t.user_id)}">${escapeHTML(t.email||t.user_id)} (${escapeHTML(t.role)})</option>`).join('');
 $('#adminTeacherClass').innerHTML='<option value="">— Tiada kelas —</option>'+classRows.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join('');
 $('#adminCurrentClass').innerHTML=classRows.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join('');
 if(currentClass)$('#adminCurrentClass').value=currentClass;
 $('#adminUnassigned').innerHTML=unassigned.length?unassigned.map(s=>`<label style="display:block"><input type="checkbox" value="${escapeHTML(s.id)}" class="unassigned-student"> ${escapeHTML(s.name)}</label>`).join(''):'Tiada murid yang belum mempunyai kelas.';
 $('#adminTeacherList').innerHTML=teacherRows.map(t=>`<div>${escapeHTML(t.email||t.user_id)} — ${escapeHTML(classRows.find(c=>c.id===t.class_id)?.name||'Belum ditetapkan')}</div>`).join('');
}
async function adminAction(fn){try{await fn();await loadAdmin();alert('Berjaya disimpan.')}catch(err){alert('Gagal: '+err.message)}}
$('#adminCreateClass').onclick=()=>adminAction(async()=>{
 const name=$('#adminNewClass').value.trim();if(!name)throw Error('Masukkan nama kelas.');
 const {error}=await client.rpc('kafa_admin_create_class',{p_name:name});if(error)throw error;
 $('#adminNewClass').value='';const {data,error:e}=await client.from('kafa_classes').select('id,name').eq('school_id',currentSchool).order('name');if(e)throw e;classRows=data||[];
});
$('#adminRegisterTeacher').onclick=()=>adminAction(async()=>{
 const email=$('#adminTeacherEmail').value.trim();if(!email)throw Error('Masukkan e-mel guru.');
 const {error}=await client.rpc('kafa_admin_register_teacher',{p_email:email});if(error)throw error;
 $('#adminTeacherEmail').value='';
});
$('#adminAssignTeacher').onclick=()=>adminAction(async()=>{
 const uid=$('#adminTeacher').value;const cid=$('#adminTeacherClass').value||null;
 if(!uid)throw Error('Tiada akaun guru dipilih.');
 const {error}=await client.rpc('kafa_admin_assign_teacher',{p_user_id:uid,p_class_id:cid});if(error)throw error;
});
$('#adminAssignStudents').onclick=()=>adminAction(async()=>{
 const cid=$('#adminClassSelect').value;
 const ids=[...document.querySelectorAll('.unassigned-student:checked')].map(x=>x.value);
 if(!cid||!ids.length)throw Error('Pilih kelas dan sekurang-kurangnya seorang murid.');
 const {error}=await client.rpc('kafa_admin_assign_students',{p_student_ids:ids,p_class_id:cid});if(error)throw error;
});
$('#adminOpenClass').onclick=async()=>{
 const cid=$('#adminCurrentClass').value;if(!cid)return;
 currentClass=cid;const {data,error}=await client.from('kafa_schools').select('meta').eq('id',currentSchool).single();if(error)return alert(error.message);
 await loadClassStudents(data.meta);alert('Paparan kelas ditukar.');
};
async function setSession(session){user=session?.user||null;$('#authPanel').classList.toggle('hidden',!!user);$('#appArea').classList.toggle('hidden',!user);if(user){$('#accountInfo').textContent=user.email;try{await loadRemote();$('#loginStatus').textContent=''}catch(err){$('#loginStatus').textContent=err.message;$('#appArea').classList.add('hidden');$('#authPanel').classList.remove('hidden')}}}
const config=window.KAFA_SUPABASE||{};
if(!config.url||!config.anonKey||config.url.includes('YOUR_')){$('#loginStatus').textContent='Sila isi config.js dengan URL projek dan publishable/anon key Supabase.';$('#loginBtn').disabled=true}
else{const supabaseUrl=String(config.url).trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i,'');client=createClient(supabaseUrl,config.anonKey);$('#loginBtn').onclick=async()=>{const {data,error}=await client.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error){$('#loginStatus').textContent=error.message;return}await setSession(data.session)};$('#logoutBtn').onclick=async()=>{await client.auth.signOut();await setSession(null)};client.auth.getSession().then(({data})=>setSession(data.session));}
