import { designationLabels } from "./register-labels";

type MidweekIncomingType = {
  week_date: string;
  mwb_week_date: string;
  mwb_week_date_locale: string;
  mwb_weekly_bible_reading: string;
  mwb_song_first: number | string;
  mwb_tgw_talk_title: string;
  mwb_tgw_gems_title: string;
  mwb_tgw_bread: string;
  mwb_tgw_bread_title: string;
  mwb_ayf_count: number;
  mwb_ayf_part1_type?: string;
  mwb_ayf_part1_time?: number;
  mwb_ayf_part1_title?: string;
  mwb_ayf_part1?: string;
  mwb_ayf_part2_type?: string;
  mwb_ayf_part2_time?: number;
  mwb_ayf_part2_title?: string;
  mwb_ayf_part2?: string;
  mwb_ayf_part3_type?: string;
  mwb_ayf_part3_time?: number;
  mwb_ayf_part3_title?: string;
  mwb_ayf_part3?: string;
  mwb_ayf_part4_type?: string;
  mwb_ayf_part4_time?: number;
  mwb_ayf_part4_title?: string;
  mwb_ayf_part4?: string;
  mwb_song_middle: number | string;
  mwb_lc_count: number;
  mwb_lc_part1_time?: number;
  mwb_lc_part1_title?: string;
  mwb_lc_part1_content?: string;
  mwb_lc_part2_time?: number;
  mwb_lc_part2_title?: string;
  mwb_lc_part2_content?: string;
  mwb_lc_cbs?: string;
  mwb_lc_cbs_title?: string;
  mwb_song_conclude: number | string;
};


type Part = {
  key: keyof typeof designationLabels;
  label: string;
  title?: string;
  src?: string;
  time?: number;
};

const removeDiacritics = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

const normalizeAyfKey = (type?: string, title?: string, content?: string): keyof typeof designationLabels | undefined => {
  if (!type) return undefined;
  const t = removeDiacritics(type.toLowerCase());
  const ttl = removeDiacritics((title || '').toLowerCase());
  const cnt = removeDiacritics((content || '').toLowerCase());

  if (t.includes('iniciando')) return 'iniciando_conversas';
  if (t.includes('cultivando')) return 'cultivando_interesse';
  if (t.includes('fazendo')) return 'fazendo_discipulos';
  if (t.includes('explicando')) {
    if (ttl.includes('discurso')) return 'explicando_crencas_discurso';
    if (cnt.includes('demonstr') || ttl.includes('demonstr')) return 'explicando_crencas_demonstracao';
    return 'explicando_crencas_demonstracao';
  }
  if (t.includes('discurso')) return 'discurso';
  return undefined;
};

export function mapMidweekToDesignations(m: MidweekIncomingType) {
  const parts: Part[] = [];

  parts.push({
    key: 'discurso_tesouros',
    label: designationLabels['discurso_tesouros'],
    title: m.mwb_tgw_talk_title,
  });

  parts.push({
    key: 'joias_espirituais',
    label: designationLabels['joias_espirituais'],
    title: m.mwb_tgw_gems_title,
  });

  parts.push({
    key: 'leitura_biblia',
    label: designationLabels['leitura_biblia'],
    title: m.mwb_tgw_bread_title,
    src: m.mwb_tgw_bread,
  });

  if (m.mwb_ayf_count >= 1) {
    const key = normalizeAyfKey(m.mwb_ayf_part1_type, m.mwb_ayf_part1_title, m.mwb_ayf_part1);
    if (key) {
      parts.push({
        key,
        label: designationLabels[key],
        title: m.mwb_ayf_part1_title,
        src: m.mwb_ayf_part1,
        time: m.mwb_ayf_part1_time,
      });
    }
  }

  if (m.mwb_ayf_count >= 2 && m.mwb_ayf_part2_title) {
    const key = normalizeAyfKey(m.mwb_ayf_part2_type, m.mwb_ayf_part2_title, m.mwb_ayf_part2);
    if (key) {
      parts.push({
        key,
        label: designationLabels[key],
        title: m.mwb_ayf_part2_title,
        src: m.mwb_ayf_part2,
        time: m.mwb_ayf_part2_time,
      });
    }
  }

  if (m.mwb_ayf_count >= 3 && m.mwb_ayf_part3_title) {
    const key = normalizeAyfKey(m.mwb_ayf_part3_type, m.mwb_ayf_part3_title, m.mwb_ayf_part3);
    if (key) {
      parts.push({
        key,
        label: designationLabels[key],
        title: m.mwb_ayf_part3_title,
        src: m.mwb_ayf_part3,
        time: m.mwb_ayf_part3_time,
      });
    }
  }

  if (m.mwb_ayf_count >= 4 && m.mwb_ayf_part4_title) {
    const key = normalizeAyfKey(m.mwb_ayf_part4_type, m.mwb_ayf_part4_title, m.mwb_ayf_part4);
    if (key) {
      parts.push({
        key,
        label: designationLabels[key],
        title: m.mwb_ayf_part4_title,
        src: m.mwb_ayf_part4,
        time: m.mwb_ayf_part4_time,
      });
    }
  }

  parts.push({
    key: 'nossa_vida_crista',
    label: designationLabels['nossa_vida_crista'],
    title: m.mwb_lc_part1_title,
    src: m.mwb_lc_part1_content,
    time: m.mwb_lc_part1_time,
  });

  if (m.mwb_lc_count > 1 && m.mwb_lc_part2_title) {
    parts.push({
      key: 'nossa_vida_crista',
      label: designationLabels['nossa_vida_crista'],
      title: m.mwb_lc_part2_title,
      src: m.mwb_lc_part2_content,
      time: m.mwb_lc_part2_time,
    });
  }

  parts.push({
    key: 'estudo_biblico_congregacao',
    label: designationLabels['estudo_biblico_congregacao'],
    title: m.mwb_lc_cbs_title,
    src: m.mwb_lc_cbs,
  });

  return {
    week_date: m.week_date,
    locale: m.mwb_week_date_locale,
    parts,
  };
}