import {cssStyles, UIElementNames, IFrameService} from '../src/iframe-service';

describe('UIService', () => {
  let uiService: IFrameService;

  beforeEach(async () => {
    uiService = new IFrameService();
    await uiService.mount();
  });

  it('should reference the correct UI elements in the style definition', () => {
    expect(cssStyles).toMatch(`iframe#${UIElementNames.IFrame}`);
    expect(cssStyles).toMatch(`div#${UIElementNames.Container}`);
  });

  it('should mount the UI', async () => {
    expect(document.querySelector(`#${UIElementNames.Styles}`)).toBeInstanceOf(HTMLStyleElement);
    expect(document.querySelector(`#${UIElementNames.Container}`)).toBeInstanceOf(HTMLDivElement);
    expect(document.querySelector(`#${UIElementNames.IFrame}`)).toBeInstanceOf(HTMLIFrameElement);
  });

  it('should unmount the UI', () => {
    uiService.unmount();

    expect(document.querySelector(`#${UIElementNames.Styles}`)).toBeNull();
    expect(document.querySelector(`#${UIElementNames.Container}`)).toBeNull();
    expect(document.querySelector(`#${UIElementNames.IFrame}`)).toBeNull();
  });

  it("should return a reference to the iframe's content window", async () => {
    const target = await uiService.getTarget();
    expect(target.constructor.toString()).toEqual(Window.toString());
  });
});
