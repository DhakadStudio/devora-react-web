import { render, screen } from '@testing-library/react';
import { CurriculumProvider, useCurriculum } from './CurriculumProvider';
import { listPathsTree } from '../engines/curriculum';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the curriculum engine
vi.mock('../engines/curriculum', () => ({
  ...vi.importActual('../engines/curriculum'),
  listPathsTree: vi.fn(),
}));

// Test component that uses the curriculum context
function TestComponent() {
  const { data, status } = useCurriculum();
  if (status === 'loading') return <div>loading</div>;
  if (status === 'error') return <div>error</div>;
  if (!data) return <div>no data</div>;
  // Render the first path's title
  return <div data-testid="curriculum-data">{data[0]?.title ?? 'no title'}</div>;
}

describe('CurriculumProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage between tests
    sessionStorage.clear();
  });

  it('fetches curriculum data on initial load', async () => {
    // Arrange
    const mockTree = [
      {
        id: 'test-path',
        title: 'Test Path',
        summary: 'Test summary',
        level: 'Beginner',
        hours: 10,
        prerequisites: 'None',
        outcomes: ['Learn something'],
        courses: [],
      },
    ];
    (listPathsTree as ReturnType<typeof vi.fn>).mockResolvedValue(mockTree);

    // Act
    render(
      <CurriculumProvider>
        <TestComponent />
      </CurriculumProvider>
    );

    // Assert
    expect(listPathsTree).toHaveBeenCalledTimes(1);

    // Wait for the data to be set
    const dataElement = await screen.findByTestId('curriculum-data');
    expect(dataElement).toHaveTextContent('Test Path');
  });
});