import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { DailyWidget } from '@/widgets/android/DailyWidget';
import { getDailyWidgetContent } from '@/data/dailyWidget';
import type { CalendarType } from '@/hooks/usePreferences';

const PREFERENCES_KEY = '@orthotypikon/preferences';

async function readCalendarType(): Promise<CalendarType> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    const saved = raw ? JSON.parse(raw) as { calendarType?: CalendarType } : {};
    return saved.calendarType ?? 'gregorian';
  } catch {
    return 'gregorian';
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== 'OrthoTypikonDaily' || props.widgetAction === 'WIDGET_DELETED') return;
  const content = getDailyWidgetContent(new Date(), await readCalendarType());
  props.renderWidget({
    light: <DailyWidget content={content} mode="light" />,
    dark: <DailyWidget content={content} mode="dark" />,
  });
}