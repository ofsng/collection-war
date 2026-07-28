import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, Card, DefinitionRow, StatusBadge, Text } from './components';
import { colors, spacing, statusColors } from './tokens';

describe('Button', () => {
  it('renders a real button element', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined();
  });

  it('defaults to type="button"', () => {
    // Without this, dropping the component into a form turns it into a submit button.
    render(<Button>Retry</Button>);

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('exposes the disabled state to assistive technology', () => {
    render(<Button disabled>Retry</Button>);

    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });
});

describe('StatusBadge', () => {
  it('always renders a text label, not colour alone', () => {
    // Colour-only status is unreadable for a colour-blind player and invisible to a
    // screen reader.
    render(<StatusBadge tone="down" label="Unavailable" />);

    expect(screen.getByText('Unavailable')).toBeDefined();
  });

  it('hides the decorative dot from assistive technology', () => {
    const { container } = render(<StatusBadge tone="up" label="Available" />);

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('maps each tone to its status colour', () => {
    expect(statusColors.up).toBe(colors.success);
    expect(statusColors.down).toBe(colors.danger);
  });
});

describe('DefinitionRow', () => {
  it('uses dt/dd so the term and value are semantically paired', () => {
    const { container } = render(
      <dl>
        <DefinitionRow term="Endpoint">http://localhost:4000</DefinitionRow>
      </dl>,
    );

    expect(container.querySelector('dt')?.textContent).toBe('Endpoint');
    expect(container.querySelector('dd')?.textContent).toBe('http://localhost:4000');
  });
});

describe('Text and Card', () => {
  it('renders secondary text in the secondary colour', () => {
    render(<Text tone="secondary">Subtitle</Text>);

    expect(screen.getByText('Subtitle').style.color).toBeTruthy();
  });

  it('renders children inside a card', () => {
    render(
      <Card>
        <Text>Inside</Text>
      </Card>,
    );

    expect(screen.getByText('Inside')).toBeDefined();
  });
});

describe('tokens', () => {
  it('uses a consistent 4px spacing scale', () => {
    // Guards against someone adding an off-scale value like '13px', which is how spacing
    // consistency erodes one component at a time.
    for (const value of Object.values(spacing)) {
      expect(Number.parseInt(value, 10) % 4).toBe(0);
    }
  });

  it('names colours semantically rather than literally', () => {
    // `danger`, not `red`: the name must survive a palette change.
    const literalNames = Object.keys(colors).filter((name) =>
      /^(red|green|blue|yellow|orange|purple|grey|gray)$/i.test(name),
    );

    expect(literalNames).toEqual([]);
  });
});
