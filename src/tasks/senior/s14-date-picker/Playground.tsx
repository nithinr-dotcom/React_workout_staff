import { useState, type ComponentType } from 'react';
import type { DatePickerProps, IsoDate } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<DatePickerProps> } }) {
  const DatePicker = impl.default;
  const [dob, setDob] = useState<IsoDate | null>(null);
  const [checkIn, setCheckIn] = useState<IsoDate | null>('2026-09-18');

  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 420 }}>
      <section>
        <h3>Date of birth (no limits)</h3>
        <DatePicker label="Date of birth" value={dob} onChange={setDob} />
        <p>
          value: <code>{JSON.stringify(dob)}</code>
        </p>
      </section>
      <section>
        <h3>Hotel check-in (today fixed to 2026-09-14, next 60 days only)</h3>
        <DatePicker
          label="Check-in"
          value={checkIn}
          onChange={setCheckIn}
          today="2026-09-14"
          min="2026-09-14"
          max="2026-11-13"
        />
        <p>
          value: <code>{JSON.stringify(checkIn)}</code>
        </p>
      </section>
    </div>
  );
}
