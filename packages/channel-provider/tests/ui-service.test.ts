import {UIService} from '../src/ui-service';

describe('UIService', () => {
  let uiService: UIService;

  beforeEach(async () => {
    uiService = new UIService();
    await uiService.mount();
  });

  it('should mount the UI', async () => {
    expect(document.querySelector('#channelProviderUiStyles')).toBeInstanceOf(HTMLStyleElement);
    expect(document.querySelector('#channelProviderUiContainer')).toBeInstanceOf(HTMLDivElement);
    expect(document.querySelector('#channelProviderUi')).toBeInstanceOf(HTMLIFrameElement);
  });

  it('should unmount the UI', () => {
    uiService.unmount();

    expect(document.querySelector('#channelProviderUiStyles')).toBe(null);
    expect(document.querySelector('#channelProviderUiContainer')).toBe(null);
    expect(document.querySelector('#channelProviderUi')).toBe(null);
  });

  it("should return a reference to the iframe's content window", async () => {
    const target = await uiService.getTarget();
    expect(target.constructor).toEqual(Window);
  });
});
