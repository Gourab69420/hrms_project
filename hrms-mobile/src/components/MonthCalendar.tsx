import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Card } from './ui';
import { colors, fonts } from '../theme';

export type MarkedDates = Record<string, { dots?: { key: string; color: string }[] } & Record<string, unknown>>;

export const DOT = {
  present: '#10B981',
  late: '#F59E0B',
  absent: '#EF4444',
  leave: '#2563EB',
  holiday: '#7C3AED',
} as const;

/** App-styled month calendar (Sora headers, Plex days) with multi-dot marks. */
export function MonthCalendar({
  marked,
  selected,
  onDay,
  onMonth,
  minDate,
  maxDate,
}: {
  marked: MarkedDates;
  selected?: string | null;
  onDay?: (date: string) => void;
  onMonth?: (month: string) => void;
  minDate?: string;
  maxDate?: string;
}) {
  const merged = useMemo<MarkedDates>(() => {
    if (!selected) return marked;
    return {
      ...marked,
      [selected]: { ...(marked[selected] ?? {}), selected: true, selectedColor: colors.royalSoft },
    };
  }, [marked, selected]);

  return (
    <Card style={styles.wrap}>
      <Calendar
        markingType="multi-dot"
        markedDates={merged}
        onDayPress={(d) => onDay?.(d.dateString)}
        onMonthChange={(d) => onMonth?.(d.dateString.slice(0, 7))}
        minDate={minDate}
        maxDate={maxDate}
        hideExtraDays={false}
        theme={{
          backgroundColor: '#FFFFFF',
          calendarBackground: '#FFFFFF',
          textSectionTitleColor: colors.muted,
          selectedDayBackgroundColor: colors.royalSoft,
          selectedDayTextColor: colors.navy,
          todayTextColor: colors.navy,
          dayTextColor: colors.text,
          textDisabledColor: colors.placeholder,
          monthTextColor: colors.text,
          textMonthFontFamily: fonts.display,
          textMonthFontSize: 16,
          textDayFontFamily: fonts.body,
          textDayFontSize: 14,
          textDayHeaderFontFamily: fonts.semiBold,
          textDayHeaderFontSize: 12,
        }}
      />
    </Card>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <Text style={styles.label}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

export type HolDay = { id: number; date: string; name: string; description: string | null; source?: string };

/** Shared holiday calendar: purple = official sheet, blue = local. Tap a day for details. */
export function HolidayCalendar({ data }: { data: HolDay[] }) {
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(thisMonth);
  const [selected, setSelected] = useState<string | null>(null);

  const marked = useMemo<MarkedDates>(() => {
    const m: MarkedDates = {};
    data
      .filter((h) => h.date.slice(0, 7) === month)
      .forEach((h) => {
        const color = h.source === 'appsheet' ? DOT.holiday : DOT.leave;
        const cur = m[h.date] ?? { dots: [] };
        cur.dots = [...(cur.dots ?? []), { key: `${h.id}-${color}`, color }];
        m[h.date] = cur;
      });
    return m;
  }, [data, month]);

  const sel = selected ? data.filter((h) => h.date === selected) : [];

  return (
    <View style={{ gap: 10 }}>
      <MonthCalendar marked={marked} selected={selected} onMonth={setMonth} onDay={setSelected} />
      <Legend
        items={[
          { color: DOT.holiday, label: 'Official sheet' },
          { color: DOT.leave, label: 'Local' },
        ]}
      />
      {selected && sel.length > 0 && (
        <Card>
          {sel.map((h) => (
            <View key={h.id} style={{ marginBottom: 8 }}>
              <Text style={styles.holName}>{h.name}</Text>
              <Text style={styles.holDate}>
                {h.date}
                {h.description ? ` • ${h.description}` : ''}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 11, fontFamily: fonts.body, color: colors.muted },
  holName: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  holDate: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
});
