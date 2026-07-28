import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LOCALE_STORAGE_KEY } from '@collection-war/localization';
import { LocaleProvider } from './locale-provider';
import { LanguageSwitcher } from './language-switcher';

afterEach(() => {
  document.cookie = `${LOCALE_STORAGE_KEY}=; path=/; max-age=0`;
});

describe('LanguageSwitcher', () => {
  it('is a labelled native select, usable by keyboard and screen reader', () => {
    render(
      <LocaleProvider initialLocale="tr-TR">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText('Dil')).toBeInstanceOf(HTMLSelectElement);
  });

  it('names each language in its own language', () => {
    // Someone who cannot read the current interface language must still recognise theirs.
    render(
      <LocaleProvider initialLocale="en">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    expect(screen.getByRole('option', { name: 'Türkçe' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
  });

  it('switches the interface language immediately', async () => {
    render(
      <LocaleProvider initialLocale="tr-TR">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    expect(screen.getByText('Dil')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'en');

    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('persists the choice so it survives a reload', async () => {
    render(
      <LocaleProvider initialLocale="tr-TR">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    await userEvent.selectOptions(screen.getByRole('combobox'), 'en');

    expect(document.cookie).toContain(`${LOCALE_STORAGE_KEY}=en`);
  });
});

describe('LocaleProvider', () => {
  it('renders Turkish by default', () => {
    render(
      <LocaleProvider initialLocale="tr-TR">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    expect(screen.getByText('Dil')).toBeInTheDocument();
  });

  it('prefers a previously stored choice over the server-supplied locale', () => {
    // The player's explicit choice wins over anything inferred.
    document.cookie = `${LOCALE_STORAGE_KEY}=en; path=/`;

    render(
      <LocaleProvider initialLocale="tr-TR">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('ignores an unsupported stored value rather than trusting it', () => {
    document.cookie = `${LOCALE_STORAGE_KEY}=de-DE; path=/`;

    render(
      <LocaleProvider initialLocale="tr-TR">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    expect(screen.getByText('Dil')).toBeInTheDocument();
  });
});
