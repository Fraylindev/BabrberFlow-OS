import { OrganizationsService } from '../organizations/organizations.service';
import { ClerkMeController } from './clerk-me.controller';

describe('ClerkMeController', () => {
  const organizationId = 'f28b2d63-79b6-43f3-8d5a-a24a4ba3fc82';
  const organization = {
    id: organizationId,
    name: 'Organización QA',
  };
  const findMine = jest.fn();
  const controller = new ClerkMeController({
    findMine,
  } as unknown as OrganizationsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reutiliza directamente OrganizationsService.findMine con el tenant autenticado', async () => {
    findMine.mockResolvedValue(organization);

    await expect(controller.findMine(organizationId)).resolves.toBe(
      organization,
    );
    expect(findMine).toHaveBeenCalledTimes(1);
    expect(findMine).toHaveBeenCalledWith(organizationId);
  });
});
