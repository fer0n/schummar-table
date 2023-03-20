import { useDayzed } from 'dayzed';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { gray } from '../theme/defaultTheme/defaultClasses';
import { useCssVariables } from '../theme/useCssVariables';
import { DateInput } from './dateInput';
import { Text } from './text';

export type DateRange = { min: Date; max: Date };

export type DatePickerQuickOption =
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear'
  | 'lastSevenDays'
  | 'lastThirtyDays'
  | { label: ReactNode; value: Date | DateRange | (() => Date | DateRange) }
  | ((onChange: (value: Date | DateRange | null) => void) => ReactNode);

export type DatePickerProps = {
  /** Currently selected day or range of days. */
  value: Date | DateRange | null;
  /** Callback for when the day (range) changes. */
  onChange: (value: Date | DateRange | null) => void;
  /** If enabled, ranges can be selected. */
  rangeSelect?: boolean;
  /** Which locale to use to render the calendar. */
  locale?: string;
  /** Which day of the week should be in the first column. (0=Sunday, 1=Monday, ...)
   * @default 1
   */
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Which month to show initially */
  defaultDateInView?: Date;
  /** Show buttons to quickly select suggested dates or date ranges */
  quickOptions?: DatePickerQuickOption[];
};

const weekDays = [0, 1, 2, 3, 4, 5, 6] as const;

/** Rounds a date down to the start of the day. */
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Rounds a date up to the end of the day. */
export const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, -1);

export const lastDays = (days: number): DateRange => {
  const now = new Date();
  const min = new Date(now);
  min.setDate(min.getDate() - days + 1);

  return {
    min: startOfDay(min),
    max: endOfDay(now),
  };
};

export const today = () => lastDays(1);

export const thisWeek = (delta = 0, firstDayOfWeek = 1): DateRange => {
  const now = new Date();
  const min = new Date(now);

  let diff = min.getDay() - firstDayOfWeek;
  if (diff < 0) {
    diff += 7;
  }
  min.setDate(min.getDate() - diff + delta * 7);

  const max = new Date(min);
  max.setDate(max.getDate() + 6);

  return {
    min: startOfDay(min),
    max: endOfDay(max),
  };
};

export const thisMonth = (delta = 0): DateRange => {
  const now = new Date();
  const min = new Date(now);
  min.setDate(1);
  min.setMonth(min.getMonth() + delta);
  const max = new Date(min);
  max.setMonth(max.getMonth() + 1);
  max.setDate(max.getDate() - 1);

  return {
    min: startOfDay(min),
    max: endOfDay(max),
  };
};

export const thisYear = (delta = 0): DateRange => {
  const now = new Date();
  const min = new Date(now);
  min.setDate(1);
  min.setMonth(0);
  min.setFullYear(min.getFullYear() + delta);
  const max = new Date(min);
  max.setFullYear(max.getFullYear() + 1);
  max.setDate(max.getDate() - 1);

  return {
    min: startOfDay(min),
    max: endOfDay(max),
  };
};

export const commonQuickOptions = {
  today: { label: <Text id="today" />, value: today },
  thisWeek: { label: <Text id="thisWeek" />, value: (props) => thisWeek(0, props.firstDayOfWeek) },
  thisMonth: { label: <Text id="thisMonth" />, value: () => thisMonth() },
  thisYear: { label: <Text id="thisYear" />, value: () => thisYear() },
  lastSevenDays: { label: <Text id="lastSevenDays" />, value: () => lastDays(7) },
  lastThirtyDays: { label: <Text id="lastThirtyDays" />, value: () => lastDays(30) },
} satisfies Record<
  DatePickerQuickOption & string,
  { label: ReactNode; value: Date | DateRange | ((props: DatePickerProps) => Date | DateRange) }
>;

/** Returns whether two dates and/or date ranges intersect. Intersection is considered per day. */
export function dateIntersect(a: Date | null | DateRange, b: Date | null | DateRange) {
  if (a instanceof Date) {
    a = { min: a, max: a };
  }
  if (b instanceof Date) {
    b = { min: b, max: b };
  }

  if (!a?.min || !a.max || !b?.min || !b.max) {
    return false;
  }

  return !(endOfDay(a.max) < startOfDay(b.min) || startOfDay(a.min) > endOfDay(b.max));
}

export function DatePicker(props: DatePickerProps) {
  const {
    value,
    onChange,
    rangeSelect,
    locale,
    firstDayOfWeek = 1,
    defaultDateInView,
    quickOptions = ['today', 'thisWeek'],
  } = props;

  const Button = useTheme((t) => t.components.Button);
  const IconButton = useTheme((t) => t.components.IconButton);
  const ChevronRight = useTheme((t) => t.icons.ChevronRight);
  const cssVariables = useCssVariables();

  const mountTime = useMemo(() => new Date(), []);
  const [dateInView, setDateInView] = useState<Date>(defaultDateInView ?? mountTime);
  const [dirty, setDirty] = useState<Partial<DateRange>>();
  const [hovered, setHovered] = useState<Date>();

  const min = dirty ? dirty.min : value instanceof Date ? value : value?.min;
  const max = dirty ? dirty.max : value instanceof Date ? value : value?.max;

  const resolvedQuickOptions = [...quickOptions, { label: <Text id="reset" />, value: null }].map(
    (option, index) => {
      if (option instanceof Function) {
        return option((value) => {
          setDirty(undefined);
          onChange(value);
        });
      }

      const { label, value } = typeof option === 'string' ? commonQuickOptions[option] : option;

      return (
        <Button
          key={index}
          variant="text"
          onClick={() => {
            setDirty(undefined);

            if (value instanceof Function) {
              onChange(value(props));
            } else {
              onChange(value);
            }
          }}
        >
          {label}
        </Button>
      );
    },
  );

  const { calendars, getBackProps, getForwardProps, getDateProps } = useDayzed({
    onDateSelected: () => undefined,
    firstDayOfWeek,
    showOutsideDays: true,
    date: dateInView,
    onOffsetChanged: (offset) =>
      setDateInView(new Date(dateInView.getFullYear(), dateInView.getMonth() + offset)),
    offset: 0,
  });
  const now = useMemo(() => startOfDay(new Date()), []);

  const formatWeekday = useMemo(() => {
    const { format } = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return (weekDay: number) =>
      format(new Date(Date.UTC(2021, 7, ((weekDay + firstDayOfWeek) % 7) + 1)));
  }, [locale, firstDayOfWeek]);

  useEffect(
    () =>
      setDateInView(
        value === null ? defaultDateInView ?? mountTime : value instanceof Date ? value : value.max,
      ),
    [value, defaultDateInView, mountTime],
  );

  useEffect(() => {
    if (!rangeSelect) {
      setDirty(undefined);
    }
  }, [rangeSelect]);

  function set(min?: Date, max?: Date, edit?: 'min' | 'max') {
    if (!rangeSelect) {
      onChange(min ?? null);
      return;
    }

    if (min && max && min > max) {
      if (edit === 'min') {
        max = min;
      } else if (edit === 'max') {
        min = max;
      } else {
        [min, max] = [max, min];
      }
    }

    if (!min === !max) {
      setDirty(undefined);
      onChange(min && max ? { min, max: endOfDay(max) } : null);
    } else {
      setDirty({ min, max });
    }
  }

  const formatMonth = useMemo(() => {
    const { format } = new Intl.DateTimeFormat(locale, { month: 'long' });
    return (month: number) => format(new Date(2021, month));
  }, [locale]);

  const formatYear = useMemo(() => {
    const { format } = new Intl.DateTimeFormat(locale, { year: 'numeric' });
    return (year: number) => format(new Date(year, 0, 1));
  }, [locale]);

  return (
    <div css={cssVariables}>
      <div
        css={{
          display: 'grid',
          gridAutoFlow: 'column',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: 'var(--spacing)',
        }}
      >
        <DateInput
          value={min ?? null}
          onChange={(date) => set(date ?? undefined, max, 'min')}
          locale={locale}
        />

        {rangeSelect && (
          <>
            {' - '}
            <DateInput
              value={max ?? null}
              onChange={(date) => set(min, date ?? undefined, 'max')}
              locale={locale}
            />
          </>
        )}
      </div>

      {calendars.map(({ month, year, weeks }) => (
        <div key={`${month}${year}`} css={{ display: 'grid' }}>
          <div
            css={{
              margin: 'calc(var(--spacing) * 4) 0',
              display: 'grid',
              gridAutoFlow: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <IconButton {...getBackProps({ calendars })}>
              <ChevronRight css={{ transform: 'rotate3d(0, 0, 1, 180deg)' }} />
            </IconButton>

            <div css={{ display: 'flex' }}>
              {formatMonth(month)} {formatYear(year)}
            </div>

            <IconButton {...getForwardProps({ calendars })}>
              <ChevronRight />
            </IconButton>
          </div>

          <div
            css={{
              justifySelf: 'center',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, max-content)',
              fontWeight: 'bold',
            }}
          >
            {weekDays.map((_v, weekDay) => (
              <div key={weekDay} css={{ justifySelf: 'center', marginBottom: 'var(--spacing)' }}>
                {formatWeekday(weekDay)}
              </div>
            ))}

            {weeks.map((week, index) =>
              week.map((dateObject, dayIndex) => {
                if (!dateObject) {
                  return <div key={`${index}-${dayIndex}`} />;
                }

                const { prevMonth, nextMonth, date } = dateObject;
                const today = startOfDay(date).getTime() === now.getTime();

                const selected =
                  date.getTime() === min?.getTime() ||
                  (min && max && dateIntersect(date, { min, max }));
                const preSelected =
                  !selected &&
                  (date.getTime() === hovered?.getTime() ||
                    (min &&
                      !max &&
                      hovered &&
                      dateIntersect(
                        date,
                        min <= hovered ? { min, max: hovered } : { min: hovered, max: min },
                      )));

                return (
                  <button
                    key={`${index}-${dayIndex}`}
                    css={[
                      {
                        padding: 10,
                        border: '1px solid transparent',
                        background: 'transparent',
                        cursor: 'pointer',
                      },
                      (prevMonth || nextMonth) && {
                        color: gray,
                      },
                      today && {
                        border: '1px solid var(--secondaryMain)',
                      },
                      selected && {
                        background: 'var(--primaryMain)',
                        color: 'var(--primaryContrastText)',
                      },
                      preSelected && {
                        background: 'var(--primaryLight)',
                        color: 'var(--primaryContrastText)',
                      },
                    ]}
                    {...getDateProps({ dateObj: dateObject })}
                    onClick={() => {
                      if (dirty) {
                        if (min) set(min, date);
                        else set(date, max);
                      } else {
                        set(date);
                      }
                    }}
                    onPointerOver={() => setHovered(date)}
                    onPointerOut={() => setHovered(undefined)}
                  >
                    {date.getDate()}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      ))}

      <div
        css={{
          marginTop: 'var(--spacing)',
          display: 'grid',
          gridAutoFlow: 'column',
          justifyContent: 'center',
        }}
      >
        {resolvedQuickOptions}
      </div>
    </div>
  );
}
