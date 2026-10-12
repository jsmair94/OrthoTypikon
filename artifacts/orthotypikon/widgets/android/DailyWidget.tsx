'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { DailyWidgetContent } from '@/data/dailyWidget';

export function DailyWidget({ content, mode }: { content: DailyWidgetContent; mode: 'light' | 'dark' }) {
  const background = mode === 'dark' ? '#18324A' : '#FFFDF8';
  const primary = mode === 'dark' ? '#FFFFFF' : '#18324A';
  const muted = mode === 'dark' ? '#D9E0E3' : '#6D736F';
  const accent = '#E4B967';
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'orthotypikon://widget' }}
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: background, borderRadius: 22, padding: 16, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="OrthoTypikon" style={{ color: muted, fontSize: 11, fontWeight: '600' }} />
        <TextWidget text={`اليولياني ${content.julianDateKey}`} style={{ color: accent, fontSize: 10, fontWeight: '600' }} />
      </FlexWidget>
      <TextWidget text={content.verse} style={{ color: primary, fontSize: 17, fontWeight: '600', textAlign: 'right' }} />
      <TextWidget text={content.verseReference} style={{ color: muted, fontSize: 10, textAlign: 'right' }} />
      <TextWidget text={`✦ ${content.saints.slice(0, 2).join(' · ')}`} style={{ color: accent, fontSize: 11, fontWeight: '500', textAlign: 'right' }} />
    </FlexWidget>
  );
}