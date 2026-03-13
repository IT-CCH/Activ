import { computeCostBreakdown, resolveIdsFromStatus } from '../confirmDeliveryHelpers';

describe('confirmDeliveryHelpers', () => {
  test('main meal should not pick up side/dessert ids from enriched mealsById when none are explicitly set', () => {
    const initialStatus = {
      servedCount: 10,
      newMainMealId: 'm1',
      mealsById: {
        s1: { id: 's1', name: 'Side One', slot_kind: 'side', cost_per_person: '0.50' },
        s2: { id: 's2', name: 'Side Two', slot_kind: 'side', cost_per_person: '0.60' },
      },
      alternates: [
        { residentCount: 2, alternateMealId: 'm2', alternateSideMealIds: ['s1'] }
      ]
    };

    const getMealById = (id) => {
      const all = {
        m1: { id: 'm1', name: 'Main Meal', cost_per_person: '2.00' },
        m2: { id: 'm2', name: 'Alternate Meal', cost_per_person: '1.75' },
        s1: { id: 's1', name: 'Side One', cost_per_person: '0.50' },
        s2: { id: 's2', name: 'Side Two', cost_per_person: '0.60' },
      };
      return all[id] || null;
    };

    const findMealByName = (name) => null;

    const breakdown = computeCostBreakdown(initialStatus, { getMealById, findMealByName });

    // Main sides should be empty because no explicit main side ids were provided
    expect(breakdown.main.sides).toEqual([]);
    expect(breakdown.main.desserts).toEqual([]);

    // Alternate line should include its side s1 in its calculation
    expect(breakdown.alternateLines.length).toBe(1);
    expect(breakdown.alternateLines[0].sidesTotal).toBeGreaterThan(0);
  });

  test('resolveIdsFromStatus should prefer explicit arrays and fall back to single id and name', () => {
    const initial = { mealsById: {} };
    const findByName = (n) => ({ id: 'byname', name: n });

    expect(resolveIdsFromStatus(initial, { arrayIds: ['a','b'] })).toEqual(['a','b']);
    expect(resolveIdsFromStatus(initial, { singleId: 'x' })).toEqual(['x']);
    expect(resolveIdsFromStatus(initial, { nameField: 'Thing', findMealByName: findByName })).toEqual(['byname']);
  });
});
