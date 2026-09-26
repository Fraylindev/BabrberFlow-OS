import { readAwsModeration } from './media-cloudinary';

describe('Cloudinary visual moderation result', () => {
  it.each(['pending', 'approved', 'rejected'] as const)(
    'recognizes only aws_rek %s',
    (status) => {
      expect(
        readAwsModeration([
          { kind: 'manual', status: 'approved' },
          { kind: 'aws_rek', status },
        ]),
      ).toBe(status);
    },
  );

  it.each([
    undefined,
    [],
    [{ kind: 'manual', status: 'approved' }],
    [{ kind: 'aws_rek', status: 'queued' }],
    [{ kind: 'aws_rek', status: 'aborted' }],
    [{ kind: 'aws_rek', status: 123 }],
    [
      { kind: 'aws_rek', status: 'approved' },
      { kind: 'aws_rek', status: 'rejected' },
    ],
  ])('fails closed on absent or inconclusive result', (value) => {
    expect(readAwsModeration(value)).toBeNull();
  });
});
