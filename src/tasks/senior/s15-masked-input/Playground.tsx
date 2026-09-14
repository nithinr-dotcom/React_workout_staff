import { useState, type ComponentType } from 'react';
import type { MaskedInputProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<MaskedInputProps> } }) {
  const MaskedInput = impl.default;
  const [card, setCard] = useState('');
  const [phone, setPhone] = useState('4155552671');
  const [expiry, setExpiry] = useState('');

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 360 }}>
      <p>
        Try: type in the middle of an existing number, paste <code>4111-1111 1111 1111</code>, delete right after a space
        or bracket, select a range and type over it.
      </p>
      <div>
        <MaskedInput
          label="Card number"
          mask="#### #### #### ####"
          placeholder="1234 5678 9012 3456"
          autoComplete="cc-number"
          onChange={setCard}
        />
        <small>
          raw: <code>{JSON.stringify(card)}</code>
        </small>
      </div>
      <div>
        <MaskedInput
          label="Phone (US)"
          mask="(###) ###-####"
          placeholder="(415) 555-2671"
          autoComplete="tel-national"
          defaultValue="4155552671"
          onChange={setPhone}
        />
        <small>
          raw: <code>{JSON.stringify(phone)}</code>
        </small>
      </div>
      <div>
        <MaskedInput label="Expiry" mask="##/##" placeholder="MM/YY" autoComplete="cc-exp" onChange={setExpiry} />
        <small>
          raw: <code>{JSON.stringify(expiry)}</code>
        </small>
      </div>
    </div>
  );
}
