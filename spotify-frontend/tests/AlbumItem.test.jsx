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

import AlbumItem from '../src/components/AlbumItem.jsx';

describe('AlbumItem', () => {
  test('navigates to album page on click', () => {
    navigateMock.mockClear();

    render(
      <AlbumItem
        id="123"
        name="Thriller"
        desc="Best selling album"
        image="/cover.png"
      />
    );

    fireEvent.click(screen.getByText('Thriller'));
    expect(navigateMock).toHaveBeenCalledWith('/album/123');
  });
});
