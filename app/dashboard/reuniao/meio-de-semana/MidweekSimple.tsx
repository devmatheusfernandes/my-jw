// MidweekSimple.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Music, Book, Award, Clock, UserCircle, Users, Mic2, BookOpen } from 'lucide-react';
import { designationLabels } from '@/types/register-labels';

export type MidweekIncomingType = {
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

export type WeekType = 'normal' | 'visita_superintendente' | 'congresso' | 'assembleia' | 'celebracao' | 'sem_reuniao';

export type MidweekAssignmentsDisplay = {
  week_type?: WeekType;
  presidente?: string;
  oracao_inicial?: string;
  oracao_final?: string;
  leitura?: string;
  tgw_discurso_orador?: string;
  tgw_joias_dirigente?: string;
  ayf_part1_estudante?: string;
  ayf_part1_ajudante?: string;
  ayf_part2_estudante?: string;
  ayf_part2_ajudante?: string;
  ayf_part3_estudante?: string;
  ayf_part3_ajudante?: string;
  ayf_part4_estudante?: string;
  ayf_part4_ajudante?: string;
  lc_part1_apresentador?: string;
  lc_part2_apresentador?: string;
  lc_cbs_dirigente?: string;
  lc_cbs_leitor?: string;
  lc_superintendente_orador?: string;
};

const labels = designationLabels;

const removeDiacritics = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

const normalizeAyfKey = (type?: string, title?: string, content?: string):
  keyof typeof designationLabels | undefined => {
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
  return undefined;
};

type SectionProps = {
  title: string;
  icon?: React.ElementType;
  variant?: 'default' | 'green' | 'amber' | 'blue';
  children: React.ReactNode;
  delay?: number;
};

const Section: React.FC<SectionProps> = ({ title, icon: Icon, variant = 'default', children, delay = 0 }) => {
  const variants = {
    default: 'bg-muted/30 border-border',
    green: 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
    amber: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
    blue: 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
  };
  
  const titleColors = {
    default: 'text-foreground',
    green: 'text-green-700 dark:text-green-400',
    amber: 'text-amber-700 dark:text-amber-400',
    blue: 'text-blue-700 dark:text-blue-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-lg border p-3 sm:p-4 ${variants[variant]}`}
    >
      <div className={`text-xs sm:text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${titleColors[variant]}`}>
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </motion.div>
  );
};

type LineProps = {
  label: string;
  value?: React.ReactNode;
  icon?: React.ElementType;
  highlight?: boolean;
};

const Line: React.FC<LineProps> = ({ label, value, icon: Icon, highlight }) => (
  <div className={`flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-1.5 ${highlight ? 'bg-background/50 rounded-md px-2 -mx-2' : ''}`}>
    <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 sm:min-w-[140px] lg:min-w-[180px] flex-shrink-0">
      {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
      <span className="truncate">{label}</span>
    </div>
    <div className="flex-1 text-sm font-medium pl-5 sm:pl-0 break-words">{value || <span className="text-muted-foreground/50">—</span>}</div>
  </div>
);

const AssignmentLine: React.FC<{ label: string; value?: string; icon?: React.ElementType }> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-2 py-1 px-2 -mx-2 rounded-md hover:bg-background/50 transition-colors">
    {Icon && <Icon className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />}
    <span className="text-xs text-muted-foreground min-w-[80px] sm:min-w-[100px]">{label}:</span>
    <span className="text-sm font-medium flex-1 truncate">{value || <span className="text-muted-foreground/50">—</span>}</span>
  </div>
);

const SongBadge: React.FC<{ number: number | string }> = ({ number }) => (
  <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium">
    <Music className="h-3 w-3" />
    Cântico {number}
  </div>
);

const TimeBadge: React.FC<{ minutes?: number }> = ({ minutes }) => {
  if (typeof minutes !== 'number') return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
      <Clock className="h-2.5 w-2.5" />
      {minutes} min
    </span>
  );
};

const PartCard: React.FC<{
  title: string;
  subtitle?: string;
  time?: number;
  assignments?: { label: string; value?: string; icon?: React.ElementType }[];
}> = ({ title, subtitle, time, assignments }) => (
  <div className="rounded-md bg-background/50 p-3">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="text-xs sm:text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground break-words">{subtitle}</div>}
      </div>
      <div className="flex flex-col items-start sm:items-end gap-1 min-w-0">
        <TimeBadge minutes={time} />
        {assignments && assignments.length > 0 && assignments.map((a, i) => (
          <AssignmentLine key={i} label={a.label} value={a.value} icon={a.icon} />
        ))}
      </div>
    </div>
  </div>
);

export const MidweekScheduleSimple: React.FC<{ data: MidweekIncomingType; assignments?: MidweekAssignmentsDisplay }> = ({ data, assignments }) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1 pb-2"
      >
        <h2 className="text-lg sm:text-xl font-bold">{data.mwb_week_date_locale}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">{data.mwb_weekly_bible_reading}</p>
      </motion.div>

      {/* Abertura */}
      <Section title="Abertura" icon={Music} delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <SongBadge number={data.mwb_song_first} />
        </div>
        <AssignmentLine label="Presidente" value={assignments?.presidente} icon={UserCircle} />
        <AssignmentLine label="Oração inicial" value={assignments?.oracao_inicial} icon={Users} />
      </Section>

      {/* Tesouros da Palavra de Deus */}
      <Section title="Tesouros da Palavra de Deus" icon={Book} variant="green" delay={0.1}>
        <PartCard
          title="Discurso inicial"
          subtitle={data.mwb_tgw_talk_title}
          time={10}
          assignments={[
            { label: 'Orador', value: assignments?.tgw_discurso_orador, icon: Mic2 }
          ]}
        />
        <PartCard
          title={labels.joias_espirituais}
          subtitle={data.mwb_tgw_gems_title}
          time={10}
          assignments={[
            { label: 'Dirigente', value: assignments?.tgw_joias_dirigente, icon: Mic2 }
          ]}
        />
        <PartCard
          title={labels.leitura_biblia}
          subtitle={`${data.mwb_tgw_bread_title} — ${data.mwb_tgw_bread}`}
          time={4}
          assignments={[
            { label: 'Leitor', value: assignments?.leitura, icon: BookOpen }
          ]}
        />
      </Section>

      {/* Faça seu melhor no ministério */}
      <Section title="Faça seu melhor no ministério" icon={Award} variant="amber" delay={0.15}>
        {data.mwb_ayf_count >= 1 && data.mwb_ayf_part1_title && (
          <PartCard
            title={labels[normalizeAyfKey(data.mwb_ayf_part1_type, data.mwb_ayf_part1_title, data.mwb_ayf_part1) || 'iniciando_conversas']}
            subtitle={`${data.mwb_ayf_part1_title} — ${data.mwb_ayf_part1}`}
            time={data.mwb_ayf_part1_time}
            assignments={[
              { label: 'Estudante', value: assignments?.ayf_part1_estudante, icon: UserCircle },
              { label: 'Ajudante', value: assignments?.ayf_part1_ajudante, icon: Users },
            ].filter(a => !(normalizeAyfKey(data.mwb_ayf_part1_type, data.mwb_ayf_part1_title, data.mwb_ayf_part1) === 'explicando_crencas_discurso' && a.label === 'Ajudante'))}
          />
        )}
        {data.mwb_ayf_count >= 2 && data.mwb_ayf_part2_title && (
          <PartCard
            title={labels[normalizeAyfKey(data.mwb_ayf_part2_type, data.mwb_ayf_part2_title, data.mwb_ayf_part2) || 'iniciando_conversas']}
            subtitle={`${data.mwb_ayf_part2_title} — ${data.mwb_ayf_part2}`}
            time={data.mwb_ayf_part2_time}
            assignments={[
              { label: 'Estudante', value: assignments?.ayf_part2_estudante, icon: UserCircle },
              { label: 'Ajudante', value: assignments?.ayf_part2_ajudante, icon: Users },
            ].filter(a => !(normalizeAyfKey(data.mwb_ayf_part2_type, data.mwb_ayf_part2_title, data.mwb_ayf_part2) === 'explicando_crencas_discurso' && a.label === 'Ajudante'))}
          />
        )}
        {data.mwb_ayf_count >= 3 && data.mwb_ayf_part3_title && (
          <PartCard
            title={labels[normalizeAyfKey(data.mwb_ayf_part3_type, data.mwb_ayf_part3_title, data.mwb_ayf_part3) || 'cultivando_interesse']}
            subtitle={`${data.mwb_ayf_part3_title} — ${data.mwb_ayf_part3}`}
            time={data.mwb_ayf_part3_time}
            assignments={[
              { label: 'Estudante', value: assignments?.ayf_part3_estudante, icon: UserCircle },
              { label: 'Ajudante', value: assignments?.ayf_part3_ajudante, icon: Users },
            ].filter(a => !(normalizeAyfKey(data.mwb_ayf_part3_type, data.mwb_ayf_part3_title, data.mwb_ayf_part3) === 'explicando_crencas_discurso' && a.label === 'Ajudante'))}
          />
        )}
        {data.mwb_ayf_count >= 4 && data.mwb_ayf_part4_title && (
          <PartCard
            title={labels[normalizeAyfKey(data.mwb_ayf_part4_type, data.mwb_ayf_part4_title, data.mwb_ayf_part4) || 'cultivando_interesse']}
            subtitle={`${data.mwb_ayf_part4_title} — ${data.mwb_ayf_part4}`}
            time={data.mwb_ayf_part4_time}
            assignments={[
              { label: 'Estudante', value: assignments?.ayf_part4_estudante, icon: UserCircle },
              { label: 'Ajudante', value: assignments?.ayf_part4_ajudante, icon: Users },
            ].filter(a => !(normalizeAyfKey(data.mwb_ayf_part4_type, data.mwb_ayf_part4_title, data.mwb_ayf_part4) === 'explicando_crencas_discurso' && a.label === 'Ajudante'))}
          />
        )}
      </Section>

      {/* Intervalo */}
      <Section title="Intervalo" icon={Clock} delay={0.2}>
        <div className="flex justify-center py-2">
          <SongBadge number={data.mwb_song_middle} />
        </div>
      </Section>

      {/* Nossa vida cristã */}
      <Section title="Nossa vida cristã" icon={Award} variant="blue" delay={0.25}>
        {data.mwb_lc_part1_title && (
          <PartCard
            title={data.mwb_lc_part1_title}
            subtitle={data.mwb_lc_part1_content}
            time={data.mwb_lc_part1_time}
            assignments={[
              { label: 'Apresentador', value: assignments?.lc_part1_apresentador, icon: Mic2 }
            ]}
          />
        )}
        {data.mwb_lc_count > 1 && data.mwb_lc_part2_title && (
          <PartCard
            title={data.mwb_lc_part2_title}
            subtitle={data.mwb_lc_part2_content}
            time={data.mwb_lc_part2_time}
            assignments={[
              { label: 'Apresentador', value: assignments?.lc_part2_apresentador, icon: Mic2 }
            ]}
          />
        )}
        {assignments?.week_type === 'visita_superintendente' && (
          <PartCard
            title="Discurso do Superintendente"
            time={30}
            assignments={[
              { label: 'Orador', value: assignments?.lc_superintendente_orador, icon: Mic2 }
            ]}
          />
        )}
        {data.mwb_lc_cbs_title && assignments?.week_type !== 'visita_superintendente' && (
          <PartCard
            title={labels.estudo_biblico_congregacao}
            subtitle={`${data.mwb_lc_cbs_title} — ${data.mwb_lc_cbs}`}
            time={30}
            assignments={[
              { label: 'Dirigente', value: assignments?.lc_cbs_dirigente, icon: Mic2 },
              { label: 'Leitor', value: assignments?.lc_cbs_leitor, icon: BookOpen }
            ]}
          />
        )}
      </Section>

      {/* Encerramento */}
      <Section title="Encerramento" icon={Music} delay={0.3}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <SongBadge number={data.mwb_song_conclude} />
        </div>
        <AssignmentLine label="Oração final" value={assignments?.oracao_final} icon={Users} />
      </Section>
    </div>
  );
};