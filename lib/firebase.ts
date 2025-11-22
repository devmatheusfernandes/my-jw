import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp, arrayUnion, deleteDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyBUG9XjV4GivPD1sOnpAqyfo7GQsfd5jHw",
  authDomain: "testing-project-188d3.firebaseapp.com",
  databaseURL: "https://testing-project-188d3-default-rtdb.firebaseio.com",
  projectId: "testing-project-188d3",
  storageBucket: "testing-project-188d3.firebasestorage.app",
  messagingSenderId: "1019677032831",
  appId: "1:1019677032831:web:3539fada4e37059aa99a4a",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app)

const ensureUserDoc = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    await setDoc(userRef, {
      nome: user.displayName || '',
      congregacaoId: null,
      requestCongregationStatus: 'pending',
    });
  }
};

const generateUniqueCode = async () => {
  const gen = () => String(Math.floor(100000 + Math.random() * 900000));
  let code = gen();
  let exists = true;
  while (exists) {
    const q = query(collection(db, 'congregations'), where('accessCode', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) {
      exists = false;
    } else {
      code = gen();
    }
  }
  return code;
};

export const createCongregation = async (
  data: {
    nome: string;
    cidade: string;
    estado: string;
    meioSemanaDia: string;
    meioSemanaHora: string;
    fimSemanaDia: string;
    fimSemanaHora: string;
  },
  creatorUid: string
) => {
  const accessCode = await generateUniqueCode();
  const ref = await addDoc(collection(db, 'congregations'), {
    ...data,
    accessCode,
    admins: [creatorUid],
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
  });
  await setDoc(ref, { congregationId: ref.id }, { merge: true });
  return { id: ref.id, accessCode };
};

export const requestCongregationAccess = async (uid: string, identifier: string) => {
  // Tenta por ID diretamente
  let congregacaoId: string | null = null;
  const direct = await getDoc(doc(db, 'congregations', identifier));
  if (direct.exists()) {
    congregacaoId = direct.id;
  } else {
    // Tenta por nome exato
    const byName = await getDocs(query(collection(db, 'congregations'), where('nome', '==', identifier)));
    if (!byName.empty) {
      congregacaoId = byName.docs[0].id;
    } else {
      // Fallback: tenta pelo accessCode antigo
      const byCode = await getDocs(query(collection(db, 'congregations'), where('accessCode', '==', identifier)));
      if (!byCode.empty) {
        congregacaoId = byCode.docs[0].id;
      }
    }
  }

  if (!congregacaoId) {
    throw new Error('Congregação não encontrada');
  }

  const userRef = doc(db, 'users', uid);
  await setDoc(
    userRef,
    {
      congregacaoId,
      requestCongregationStatus: 'pending',
    },
    { merge: true }
  );
};

export type CongregationDoc = {
  nome: string;
  cidade: string;
  estado: string;
  meioSemanaDia: string;
  meioSemanaHora: string;
  fimSemanaDia: string;
  fimSemanaHora: string;
  admins?: string[];
  createdBy?: string;
  createdAt?: unknown;
  congregationId?: string;
  accessCode?: string;
  locaisPregacaoAprovados?: string[];
};

export type CongregationWithId = { id: string } & CongregationDoc;

export type RegisterDoc = {
  nomeCompleto: string
  nascimento?: string
  batismo?: string
  sexo?: 'homem' | 'mulher'
  status?: 'publicador_nao_batizado' | 'publicador_batizado'
  privilegioServico?: 'servo_ministerial' | 'anciao' | null
  outrosPrivilegios?: { pioneiroAuxiliar?: boolean; pioneiroRegular?: boolean }
  designacoesAprovadas?: string[]
  responsabilidades?: string[]
  familyId?: string | null
  familyRole?: 'chefe' | 'mae' | 'filho' | 'marido' | 'esposa' | null
  createdAt?: unknown
}

export type UserDoc = {
  nome: string
  congregacaoId: string | null
  requestCongregationStatus: 'pending' | 'accepted' | 'rejected' | 'no-congregation'
  registerCongregationId?: string | null
  registerId?: string | null
}

export type TerritoryRecord = {
  startedAt: string
  finishedAt?: string
  assignedRegisterIds: string[]
  observacoes?: string
}

export type TerritoryDoc = {
  cidade: string
  grupo: string
  codigo: string
  geoJson?: string
  imageUrl?: string
  registros?: TerritoryRecord[]
  sharedOpen?: boolean
  createdAt?: unknown
}

export const findCongregationsByName = async (nome: string): Promise<CongregationWithId[]> => {
  const snap = await getDocs(query(collection(db, 'congregations'), where('nome', '==', nome)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CongregationDoc) }));
};

export const searchCongregations = async (identifier: string): Promise<CongregationWithId[]> => {
  const term = identifier.trim()
  const out = new Map<string, CongregationWithId>()

  if (term.length === 0) return []

  const direct = await getDoc(doc(db, 'congregations', term))
  if (direct.exists()) out.set(direct.id, { id: direct.id, ...(direct.data() as CongregationDoc) })

  const byCode = await getDocs(query(collection(db, 'congregations'), where('accessCode', '==', term)))
  byCode.docs.forEach((d) => out.set(d.id, { id: d.id, ...(d.data() as CongregationDoc) }))

  const byName = await getDocs(query(collection(db, 'congregations'), where('nome', '>=', term), where('nome', '<=', term + '\uf8ff')))
  byName.docs.forEach((d) => out.set(d.id, { id: d.id, ...(d.data() as CongregationDoc) }))

  const byCity = await getDocs(query(collection(db, 'congregations'), where('cidade', '>=', term), where('cidade', '<=', term + '\uf8ff')))
  byCity.docs.forEach((d) => out.set(d.id, { id: d.id, ...(d.data() as CongregationDoc) }))

  return Array.from(out.values())
}

export const getUserDoc = async (uid: string): Promise<UserDoc | null> => {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as UserDoc) : null
}

export const getCongregationDoc = async (id: string): Promise<CongregationWithId | null> => {
  const ref = doc(db, 'congregations', id)
  const snap = await getDoc(ref)
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as CongregationDoc) }) : null
}

export const updateCongregation = async (
  id: string,
  data: Partial<{
    nome: string
    cidade: string
    estado: string
    meioSemanaDia: string
    meioSemanaHora: string
    fimSemanaDia: string
    fimSemanaHora: string
    locaisPregacaoAprovados: string[]
  }>
) => {
  const ref = doc(db, 'congregations', id)
  await setDoc(ref, data, { merge: true })
}

export type MidweekScheduleMonthDoc = { weeks: any[]; updatedAt?: unknown; sourceUrl?: string }

export const getMidweekScheduleMonth = async (monthId: string): Promise<MidweekScheduleMonthDoc | null> => {
  const ref = doc(db, 'global_midweek_schedule_pt', monthId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as MidweekScheduleMonthDoc) : null
}

export const upsertMidweekScheduleMonth = async (monthId: string, weeks: any[], sourceUrl?: string) => {
  const ref = doc(db, 'global_midweek_schedule_pt', monthId)
  const cleanWeeks = Array.isArray(weeks)
    ? weeks.map((w) => JSON.parse(JSON.stringify(w)))
    : []
  await setDoc(ref, { weeks: cleanWeeks, updatedAt: serverTimestamp(), ...(sourceUrl ? { sourceUrl } : {}) }, { merge: true })
}

export type MidweekAssignMonthDoc = { weeks?: Record<string, any>; updatedAt?: unknown }

export const getMidweekAssignmentsMonth = async (congregacaoId: string, monthId: string): Promise<MidweekAssignMonthDoc | null> => {
  const ref = doc(db, 'congregations', congregacaoId, 'midweek_assign', monthId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as MidweekAssignMonthDoc) : null
}

export const updateMidweekAssignmentsMonth = async (congregacaoId: string, monthId: string, weeks: Record<string, any>) => {
  const ref = doc(db, 'congregations', congregacaoId, 'midweek_assign', monthId)
  const cleanIn = JSON.parse(JSON.stringify(weeks || {})) as Record<string, any>
  const clean: Record<string, any> = {}
  Object.keys(cleanIn).forEach((k) => { clean[k.replace(/\//g, '-')] = cleanIn[k] })
  await setDoc(ref, { weeks: clean, updatedAt: serverTimestamp() }, { merge: true })
}

export const updateMidweekAssignmentsWeek = async (congregacaoId: string, monthId: string, weekDate: string, data: Record<string, any>) => {
  const ref = doc(db, 'congregations', congregacaoId, 'midweek_assign', monthId)
  const clean = JSON.parse(JSON.stringify(data || {}))
  const key = (weekDate || '').replace(/\//g, '-')
  await setDoc(ref, { weeks: { [key]: clean }, updatedAt: serverTimestamp() }, { merge: true })
}

export type WeekendAssignWeek = {
  presidente_fim_semana?: string
  dirigente_sentinela?: string
  leitor_sentinela?: string
  orador_tipo?: 'interno' | 'externo'
  orador_register_id?: string
  orador_externo_id?: string
  discurso_publico_tema?: string
  discurso_publico_cantico?: string
  hospitalidade_register_id?: string
  observacoes?: string
}

export type WeekendAssignMonthDoc = { weeks?: Record<string, WeekendAssignWeek>; updatedAt?: unknown }

export const getWeekendAssignmentsMonth = async (congregacaoId: string, monthId: string): Promise<WeekendAssignMonthDoc | null> => {
  const ref = doc(db, 'congregations', congregacaoId, 'weekend_assign', monthId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as WeekendAssignMonthDoc) : null
}

export const updateWeekendAssignmentsMonth = async (congregacaoId: string, monthId: string, weeks: Record<string, WeekendAssignWeek>) => {
  const ref = doc(db, 'congregations', congregacaoId, 'weekend_assign', monthId)
  const cleanIn = JSON.parse(JSON.stringify(weeks || {})) as Record<string, WeekendAssignWeek>
  const clean: Record<string, WeekendAssignWeek> = {}
  Object.keys(cleanIn).forEach((k) => { clean[k.replace(/\//g, '-')] = cleanIn[k] })
  await setDoc(ref, { weeks: clean, updatedAt: serverTimestamp() }, { merge: true })
}

export const updateWeekendAssignmentsWeek = async (congregacaoId: string, monthId: string, weekDate: string, data: WeekendAssignWeek) => {
  const ref = doc(db, 'congregations', congregacaoId, 'weekend_assign', monthId)
  const clean = JSON.parse(JSON.stringify(data || {}))
  const key = (weekDate || '').replace(/\//g, '-')
  await setDoc(ref, { weeks: { [key]: clean }, updatedAt: serverTimestamp() }, { merge: true })
}

export type ExternalSpeakerDoc = {
  nome: string
  congregacao?: string
  contato?: string
}

export const listExternalSpeakers = async (congregacaoId: string): Promise<({ id: string } & ExternalSpeakerDoc)[]> => {
  const snap = await getDocs(collection(db, 'congregations', congregacaoId, 'external_speakers'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ExternalSpeakerDoc) }))
}

export const createExternalSpeaker = async (congregacaoId: string, data: ExternalSpeakerDoc) => {
  const ref = await addDoc(collection(db, 'congregations', congregacaoId, 'external_speakers'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id }
}

export const updateExternalSpeaker = async (congregacaoId: string, speakerId: string, data: Partial<ExternalSpeakerDoc>) => {
  const ref = doc(db, 'congregations', congregacaoId, 'external_speakers', speakerId)
  await setDoc(ref, data, { merge: true })
}

export const listUsersByCongregation = async (congregacaoId: string): Promise<(UserDoc & { uid: string })[]> => {
  const q = query(collection(db, 'users'), where('congregacaoId', '==', congregacaoId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as UserDoc) }))
}

export const listPendingUsersByCongregation = async (congregacaoId: string): Promise<(UserDoc & { uid: string })[]> => {
  const q = query(collection(db, 'users'), where('congregacaoId', '==', congregacaoId), where('requestCongregationStatus', '==', 'pending'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as UserDoc) }))
}

export const listRegisters = async (congregacaoId: string): Promise<({ id: string } & RegisterDoc)[]> => {
  const snap = await getDocs(collection(db, 'congregations', congregacaoId, 'register'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as RegisterDoc) }))
}

export const createRegister = async (
  congregacaoId: string,
  data: {
    nomeCompleto: string
    nascimento?: string
    batismo?: string
    sexo?: 'homem' | 'mulher'
    status?: 'publicador_nao_batizado' | 'publicador_batizado'
    privilegioServico?: 'servo_ministerial' | 'anciao' | null
    outrosPrivilegios?: { pioneiroAuxiliar?: boolean; pioneiroRegular?: boolean }
    designacoesAprovadas?: string[]
    responsabilidades?: string[]
  }
) => {
  const ref = await addDoc(collection(db, 'congregations', congregacaoId, 'register'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id }
}

export const updateRegister = async (
  congregacaoId: string,
  registerId: string,
  data: Partial<{
    nomeCompleto: string
    nascimento?: string
    batismo?: string
    sexo?: 'homem' | 'mulher'
    status?: 'publicador_nao_batizado' | 'publicador_batizado'
    privilegioServico?: 'servo_ministerial' | 'anciao' | null
    outrosPrivilegios?: { pioneiroAuxiliar?: boolean; pioneiroRegular?: boolean }
    designacoesAprovadas?: string[]
    responsabilidades?: string[]
    familyId?: string | null
    familyRole?: 'chefe' | 'mae' | 'filho' | 'marido' | 'esposa' | null
  }>
) => {
  const ref = doc(db, 'congregations', congregacaoId, 'register', registerId)
  await setDoc(ref, data, { merge: true })
}

export const getRegisterDoc = async (congregacaoId: string, registerId: string): Promise<({ id: string } & RegisterDoc) | null> => {
  const ref = doc(db, 'congregations', congregacaoId, 'register', registerId)
  const snap = await getDoc(ref)
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as RegisterDoc) }) : null
}

export const attachUserToRegister = async (uid: string, congregacaoId: string, registerId: string) => {
  const userRef = doc(db, 'users', uid)
  await setDoc(userRef, { registerCongregationId: congregacaoId, registerId, requestCongregationStatus: 'accepted' }, { merge: true })
}

export const rejectUserAccess = async (uid: string) => {
  const userRef = doc(db, 'users', uid)
  await setDoc(userRef, { congregacaoId: null, requestCongregationStatus: 'rejected', registerCongregationId: null, registerId: null }, { merge: true })
}

export const unlinkUserFromCongregation = async (uid: string) => {
  const userRef = doc(db, 'users', uid)
  await setDoc(userRef, { congregacaoId: null, registerCongregationId: null, registerId: null, requestCongregationStatus: 'no-congregation' }, { merge: true })
}

export const listTerritories = async (congregacaoId: string): Promise<({ id: string } & TerritoryDoc)[]> => {
  const snap = await getDocs(collection(db, 'congregations', congregacaoId, 'territory'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TerritoryDoc) }))
}

export const createTerritory = async (congregacaoId: string, data: { cidade: string; grupo: string; codigo: string; geoJson?: string; imageUrl?: string }) => {
  const ref = await addDoc(collection(db, 'congregations', congregacaoId, 'territory'), {
    ...data,
    registros: [],
    createdAt: serverTimestamp(),
  })
  return { id: ref.id }
}

export const addTerritoryRecord = async (congregacaoId: string, territoryId: string, record: TerritoryRecord) => {
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  const payload: { startedAt: string; assignedRegisterIds: string[]; finishedAt?: string; observacoes?: string } = {
    startedAt: record.startedAt,
    assignedRegisterIds: record.assignedRegisterIds,
  }
  if (record.finishedAt && record.finishedAt.length > 0) {
    payload.finishedAt = record.finishedAt
  }
  if (record.observacoes && record.observacoes.length > 0) {
    payload.observacoes = record.observacoes
  }
  await setDoc(ref, { registros: arrayUnion(payload) }, { merge: true })
}

export const uploadTerritoryImage = async (congregacaoId: string, territoryId: string, file: Blob) => {
  const path = `congregations/${congregacaoId}/territories/${territoryId}`
  const r = storageRef(storage, path)
  await uploadBytes(r, file)
  const url = await getDownloadURL(r)
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  await setDoc(ref, { imageUrl: url }, { merge: true })
  return url
}

export const getTerritoryDoc = async (congregacaoId: string, territoryId: string): Promise<({ id: string } & TerritoryDoc) | null> => {
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  const snap = await getDoc(ref)
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as TerritoryDoc) }) : null
}

export const updateTerritory = async (congregacaoId: string, territoryId: string, data: Partial<{ cidade: string; grupo: string; codigo: string; geoJson?: string; imageUrl?: string }>) => {
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  await setDoc(ref, data, { merge: true })
}

export const closeTerritoryRecordForUser = async (congregacaoId: string, territoryId: string, registerId: string, finishedAt: string, observacoes?: string) => {
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as TerritoryDoc
  const registros = (data.registros || []).map((r) => {
    if (!r.finishedAt && r.assignedRegisterIds?.includes(registerId)) {
      const updated: TerritoryRecord = { ...r, finishedAt }
      if (observacoes && observacoes.length > 0) {
        updated.observacoes = observacoes
      }
      return updated
    }
    return r
  })
  await setDoc(ref, { registros, sharedOpen: false }, { merge: true })
}

export const deleteOpenTerritoryRecordForUser = async (congregacaoId: string, territoryId: string, registerId: string) => {
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as TerritoryDoc
  const registros = (data.registros || []).filter((r) => !(r.assignedRegisterIds?.includes(registerId) && !r.finishedAt))
  await setDoc(ref, { registros, sharedOpen: false }, { merge: true })
}

export const setTerritoryShareOpen = async (congregacaoId: string, territoryId: string, value: boolean) => {
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  await setDoc(ref, { sharedOpen: value }, { merge: true })
}

export const deleteTerritoryImage = async (congregacaoId: string, territoryId: string) => {
  const path = `congregations/${congregacaoId}/territories/${territoryId}`
  const r = storageRef(storage, path)
  try {
    await deleteObject(r)
  } catch {}
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  await setDoc(ref, { imageUrl: null }, { merge: true })
}

export const deleteTerritory = async (congregacaoId: string, territoryId: string) => {
  try {
    await deleteTerritoryImage(congregacaoId, territoryId)
  } catch {}
  const ref = doc(db, 'congregations', congregacaoId, 'territory', territoryId)
  await deleteDoc(ref)
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    return result.user;
  } catch (error) {
    console.error('Erro ao fazer login com Google:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
};

export type PregacaoEntry = {
  hora: string
  local: string
  observacoes?: string
  dirigenteRegisterId?: string
}

export type PregacaoByDay = {
  [diaSemana: string]: PregacaoEntry[]
}

export type PregacaoFixedDoc = {
  porDia: PregacaoByDay
  diasAtivos?: string[]
}

export type PregacaoMonthDoc = {
  porDia?: PregacaoByDay
  porDiaSemanas?: { [diaSemana: string]: PregacaoEntry[] }
  diasAtivos?: string[]
}

export const getPregacaoFixed = async (congregacaoId: string): Promise<PregacaoFixedDoc | null> => {
  const ref = doc(db, 'congregations', congregacaoId, 'pregacao', 'fixed')
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as PregacaoFixedDoc) : null
}

export const updatePregacaoFixed = async (congregacaoId: string, data: PregacaoFixedDoc) => {
  const ref = doc(db, 'congregations', congregacaoId, 'pregacao', 'fixed')
  await setDoc(ref, data, { merge: true })
}

export const getPregacaoMonth = async (congregacaoId: string, monthId: string): Promise<PregacaoMonthDoc | null> => {
  const ref = doc(db, 'congregations', congregacaoId, 'pregacao_month', monthId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as PregacaoMonthDoc) : null
}

export const updatePregacaoMonth = async (congregacaoId: string, monthId: string, data: PregacaoMonthDoc) => {
  const ref = doc(db, 'congregations', congregacaoId, 'pregacao_month', monthId)
  await setDoc(ref, data, { merge: true })
}
export type FamilyMember = { registerId: string; role: 'chefe' | 'mae' | 'filho' | 'marido' | 'esposa' }
export type FamilyDoc = { nome?: string; membros?: FamilyMember[]; createdAt?: unknown }

export const listFamilies = async (congregacaoId: string): Promise<({ id: string } & FamilyDoc)[]> => {
  const snap = await getDocs(collection(db, 'congregations', congregacaoId, 'family'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FamilyDoc) }))
}

export const createFamily = async (congregacaoId: string, nome?: string) => {
  const ref = await addDoc(collection(db, 'congregations', congregacaoId, 'family'), {
    nome: nome || '',
    membros: [],
    createdAt: serverTimestamp(),
  })
  return { id: ref.id }
}

export const addFamilyMember = async (congregacaoId: string, familyId: string, member: FamilyMember) => {
  const ref = doc(db, 'congregations', congregacaoId, 'family', familyId)
  await setDoc(ref, { membros: arrayUnion(member) }, { merge: true })
}

export const removeFamilyMember = async (congregacaoId: string, familyId: string, registerId: string) => {
  const ref = doc(db, 'congregations', congregacaoId, 'family', familyId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as FamilyDoc
  const remaining = (data.membros || []).filter((m) => m.registerId !== registerId)
  await setDoc(ref, { membros: remaining }, { merge: true })
}