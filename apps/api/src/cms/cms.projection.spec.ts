import { UserRole } from '@prisma/client';
import { organizationSelectForRole } from '../organizations/organization-projection';
import { projectContent, projectReceipt } from './cms.projection';

describe('Allowlists CMS/H2', () => {
  it.each([
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.BARBER,
    UserRole.RECEPTIONIST,
  ])('%s recibe solo contexto operativo', (role) => {
    expect(organizationSelectForRole(role)).toEqual({
      id: true,
      name: true,
      slug: true,
      timeZone: true,
    });
  });
  it('CUSTOMER no tiene proyección B2B', () =>
    expect(() => organizationSelectForRole(UserRole.CUSTOMER)).toThrow());
  it('descarta cualquier propiedad interna de un snapshot', () => {
    expect(
      projectContent({
        publicName: 'Público',
        phone: null,
        description: null,
        address: null,
        googleMapsUrl: null,
        email: 'private@example.test',
        id: 'tenant',
        secret: 'private',
      }),
    ).toEqual({
      publicName: 'Público',
      phone: null,
      description: null,
      address: null,
      googleMapsUrl: null,
    });
  });
  it.each([null, [], 'bad', {}, { publicName: 'Name', phone: {} }])(
    'falla cerrado con contenido corrupto %j',
    (value) => {
      expect(() => projectContent(value)).toThrow();
    },
  );
  it('el recibo no contiene cuerpo ni actor', () => {
    expect(
      projectReceipt({ version: 2, isPublished: true, publishedRevision: 1 }),
    ).toEqual({ version: 2, isPublished: true, publishedRevision: 1 });
  });
});
