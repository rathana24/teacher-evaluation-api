import { targetLabelView } from './target-labels.util';
import { assertWholeAnonymousAggregate } from './anonymous-report-scope.util';
import { BadRequestException } from '@nestjs/common';

describe('Historical labels and anonymous scope', () => {
  it('keeps legacy names unknown when current labels exist', () => {
    const current = { generation: { name: 'Current generation' } };
    expect(
      targetLabelView(
        { historical_labels: null, labels_captured_at: null },
        current,
      ),
    ).toEqual({
      historical_labels: null,
      labels_captured_at: null,
      historical_labels_status: 'UNKNOWN',
      historical_labels_unavailable_reason: 'LEGACY_LABELS_NOT_CAPTURED',
      current_labels: current,
    });
  });
  it('treats omitted older fields as unknown without manufacturing a snapshot', () => {
    expect(
      targetLabelView({}, { generation: { name: 'Renamed' } })
        .historical_labels,
    ).toBeNull();
  });
  it('requires recorded capture time before presenting labels as confirmed', () => {
    expect(
      targetLabelView(
        { historical_labels: { generation: { name: 'Unproven' } } },
        {},
      ).historical_labels_status,
    ).toBe('UNKNOWN');
  });
  it('returns saved names independently of renamed current records', () => {
    const saved = {
      schema_version: 1,
      generation: { name: 'ជំនាន់ "Original"' },
    };
    const capturedAt = new Date('2026-10-08T00:00:00Z');
    const view = targetLabelView(
      { historical_labels: saved, labels_captured_at: capturedAt },
      { generation: { name: 'New name' } },
    );
    expect(view.historical_labels).toBe(saved);
    expect(view.labels_captured_at).toEqual(capturedAt);
    expect(view.historical_labels_status).toBe('CAPTURED');
    expect(view.current_labels).toEqual({ generation: { name: 'New name' } });
  });
  it('allows the complete aggregate with no query', () =>
    expect(() => assertWholeAnonymousAggregate()).not.toThrow());
  it.each([
    { generation_id: '1' },
    { class_group: 'A' },
    { group_scope: 'unknown' },
  ])('rejects unsupported anonymous slices %j', (query) =>
    expect(() => assertWholeAnonymousAggregate(query)).toThrow(
      BadRequestException,
    ),
  );
});
