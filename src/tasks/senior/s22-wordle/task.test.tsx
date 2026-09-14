// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Wordle = impl.default;

const row = (n: number) => screen.getByRole('group', { name: `Guess ${n}` });
const rowLetters = (n: number) => (row(n).textContent ?? '').replace(/\s/g, '').toLowerCase();
const status = () => screen.getByRole('status');

describeTask('Wordle: scoreGuess', () => {
  it('marks an exact match as all correct', () => {
    expect(impl.scoreGuess('react', 'react')).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('marks letters in the wrong spot as present and missing letters as absent', () => {
    // answer c a c h e · guess c l a s s
    expect(impl.scoreGuess('class', 'cache')).toEqual(['correct', 'absent', 'present', 'absent', 'absent']);
  });

  it('gives a correct letter priority over an earlier duplicate of that letter', () => {
    // only one "s" in "links", and it is matched exactly by the last "s"
    expect(impl.scoreGuess('lists', 'links')).toEqual(['correct', 'correct', 'absent', 'absent', 'correct']);
    // only one "r" in "fiber", matched exactly at position 5
    expect(impl.scoreGuess('error', 'fiber')).toEqual(['present', 'absent', 'absent', 'absent', 'correct']);
  });

  it('marks surplus duplicate letters absent, left to right', () => {
    // "react" has one "a" and one "r"
    expect(impl.scoreGuess('array', 'react')).toEqual(['present', 'present', 'absent', 'absent', 'absent']);
  });

  it('handles duplicate letters in the answer', () => {
    // "error" has three "r"s, none in the guessed positions
    expect(impl.scoreGuess('retry', 'error')).toEqual(['present', 'present', 'absent', 'present', 'absent']);
    // "hooks" has two "o"s: one correct, one still available for "present"
    expect(impl.scoreGuess('color', 'hooks')).toEqual(['absent', 'correct', 'absent', 'present', 'absent']);
  });
});

describeTask('Wordle: getKeyStatuses', () => {
  it('keeps the best status per letter regardless of guess order', () => {
    const expected = { t: 'present', a: 'correct', b: 'absent', l: 'absent', e: 'present', r: 'present', c: 'correct' };
    expect(impl.getKeyStatuses(['table', 'trace'], 'react')).toEqual(expected);
    expect(impl.getKeyStatuses(['trace', 'table'], 'react')).toEqual(expected);
  });

  it('returns an empty record before any guess', () => {
    expect(impl.getKeyStatuses([], 'react')).toEqual({});
  });
});

describeTask('Wordle: UI', () => {
  it('renders 6 empty rows and types letters into the first row, with Backspace', async () => {
    const user = userEvent.setup();
    render(<Wordle answer="react" />);
    for (let n = 1; n <= 6; n++) expect(rowLetters(n)).toBe('');
    await user.keyboard('taBLEs');
    expect(rowLetters(1)).toBe('table');
    await user.keyboard('{Backspace}{Backspace}');
    expect(rowLetters(1)).toBe('tab');
    expect(rowLetters(2)).toBe('');
  });

  it('rejects short guesses and words that are not in the list without using an attempt', async () => {
    const user = userEvent.setup();
    render(<Wordle answer="react" />);
    await user.keyboard('tab{Enter}');
    expect(status()).toHaveTextContent('Not enough letters');
    await user.keyboard('cd{Enter}');
    expect(status()).toHaveTextContent('Not in word list');
    expect(rowLetters(1)).toBe('tabcd');
    expect(rowLetters(2)).toBe('');
    await user.keyboard('{Backspace}');
    expect(status()).not.toHaveTextContent('Not in word list');
  });

  it('scores a submitted row on the tiles and on the on-screen keyboard', async () => {
    const user = userEvent.setup();
    render(<Wordle answer="react" />);
    await user.keyboard('table{Enter}');
    const first = within(row(1));
    expect(first.getByLabelText('T present')).toBeInTheDocument();
    expect(first.getByLabelText('A present')).toBeInTheDocument();
    expect(first.getByLabelText('B absent')).toBeInTheDocument();
    expect(first.getByLabelText('E present')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B absent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'R' })).toBeInTheDocument();
    await user.keyboard('react');
    expect(rowLetters(2)).toBe('react');
  });

  it('wins with the on-screen keyboard and then ignores further input', async () => {
    const user = userEvent.setup();
    render(<Wordle answer="react" />);
    for (const letter of ['R', 'E', 'A', 'C', 'T']) await user.click(screen.getByRole('button', { name: letter }));
    await user.click(screen.getByRole('button', { name: 'Enter' }));
    expect(status()).toHaveTextContent('You win!');
    expect(screen.getByRole('button', { name: 'R correct' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'B' }));
    expect(rowLetters(2)).toBe('');
  });

  it('loses after six wrong guesses and reveals the answer', async () => {
    const user = userEvent.setup();
    render(<Wordle answer="react" />);
    for (const word of ['state', 'props', 'hooks', 'fiber', 'redux', 'store']) {
      await user.keyboard(`${word}{Enter}`);
    }
    expect(status()).toHaveTextContent('The word was REACT');
    await user.keyboard('q');
    for (let n = 1; n <= 6; n++) expect(rowLetters(n)).toHaveLength(5);
  });
});
