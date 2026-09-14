import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's46-test-runner',
  code: 'S46',
  title: 'Mini test runner, expect & spy',
  level: 'senior',
  order: 46,
  kind: 'js',
  minutes: 80,
  summary: 'Build describe/it with scoped beforeEach/afterEach, async tests with timeouts and a report, plus expect matchers with .not and spyOn.',
  concepts: ['registration vs execution', 'scoped hooks', 'sequential async execution', 'timeouts', 'deep equality', 'monkey-patching & restore'],
  companies: ['Meta'],
  prerequisites: ['s29-deep-clone-equal'],
  frequency: 'occasional',
};

export default meta;
