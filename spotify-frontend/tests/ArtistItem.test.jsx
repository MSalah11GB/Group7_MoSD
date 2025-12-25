import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import ArtistItem from '../src/components/ArtistItem.jsx';

describe('ArtistItem', () => {
  test('navigates to artist page on click', () => {
    navigateMock.mockClear();

    render(<ArtistItem id="a1" name="Michael Jackson" image="/artist.png" />);

    fireEvent.click(screen.getByText('Michael Jackson'));
    expect(navigateMock).toHaveBeenCalledWith('/artist/a1');
  });
});
