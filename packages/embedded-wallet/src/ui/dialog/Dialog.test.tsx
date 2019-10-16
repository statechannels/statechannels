import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {Icon, IconProps, Icons} from '../icon/Icon';
import {Dialog, DialogProps} from './Dialog';
import css from './Dialog.module.css';

Enzyme.configure({adapter: new Adapter()});

type MockDialog = {
  dialogWrapper: ReactWrapper;
  backdropElement: ReactWrapper;
  dialogElement: ReactWrapper;
  header: {
    element: ReactWrapper;
    brandElement: ReactWrapper;
    title: {
      element: ReactWrapper;
      iconElement: ReactWrapper<IconProps>;
      textElement: ReactWrapper;
    };
    closeButtonElement: ReactWrapper;
  };
  contentElement: ReactWrapper;
  footer: {
    element: ReactWrapper;
    primaryButtonElement: ReactWrapper;
    secondaryButtonElement: ReactWrapper;
  };
};

const mockDialog = (props?: Partial<DialogProps>, empty = false): MockDialog => {
  const dialogWrapper = empty
    ? mount(<Dialog {...props} />)
    : mount(
        <Dialog {...props}>
          <label>Hello!</label>
        </Dialog>
      );

  return {
    dialogWrapper,
    backdropElement: dialogWrapper.find(`div.${css.backdrop}`),
    dialogElement: dialogWrapper.find('dialog'),
    header: {
      element: dialogWrapper.find(`header.${css.header}`),
      brandElement: dialogWrapper.find(`span.${css.icon}`),
      title: {
        element: dialogWrapper.find(`h1.${css.titleContainer}`),
        textElement: dialogWrapper.find(`span.${css.title}`),
        iconElement: dialogWrapper.find(Icon)
      },
      closeButtonElement: dialogWrapper.find(`button.${css.close}`)
    },
    contentElement: dialogWrapper.find(`section.${css.content}`),
    footer: {
      element: dialogWrapper.find(`footer.${css.footer}`),
      primaryButtonElement: dialogWrapper.find({type: 'primary'}),
      secondaryButtonElement: dialogWrapper.find({type: 'secondary'})
    }
  };
};

const triggerKeyOn = (target: ReactWrapper, key: string) => {
  target.simulate('keydown', {key});
};

describe('UI - Dialog', () => {
  let component: MockDialog;
  const clickedPrimary = jest.fn();
  const clickedSecondary = jest.fn();
  const closed = jest.fn();
  const defaultConfiguration = {
    title: 'Hello, user',
    closable: true,
    icon: Icons.Check,
    buttons: {
      primary: {
        label: 'Hello!',
        onClick: clickedPrimary
      },
      secondary: {
        label: 'Goodbye',
        onClick: clickedSecondary
      }
    },
    onClose: closed
  };

  beforeEach(() => {
    component = mockDialog(defaultConfiguration);
  });

  it('can be instantiated', () => {
    const {dialogElement, backdropElement, header, contentElement, footer} = component;

    expect(dialogElement.exists()).toEqual(true);
    expect(backdropElement.exists()).toEqual(true);

    const {element: headerElement, brandElement, closeButtonElement, title} = header;

    expect(headerElement.exists()).toEqual(true);
    expect(brandElement.exists()).toEqual(true);
    expect(closeButtonElement.exists()).toEqual(true);
    expect(title.element.exists()).toEqual(true);
    expect(title.iconElement.exists()).toEqual(true);
    expect(title.textElement.exists()).toEqual(true);

    expect(contentElement.exists()).toEqual(true);

    const {element: footerElement, primaryButtonElement, secondaryButtonElement} = footer;

    expect(footerElement.exists()).toEqual(true);
    expect(primaryButtonElement.exists()).toEqual(true);
    expect(secondaryButtonElement.exists()).toEqual(true);

    const {textElement: titleTextElement, iconElement: titleIconElement} = title;

    expect(titleTextElement.text()).toEqual(defaultConfiguration.title);
    expect(titleIconElement.prop('name')).toEqual(defaultConfiguration.icon);
    expect(titleIconElement.prop('decorative')).toEqual(true);

    const {buttons} = defaultConfiguration;

    expect(primaryButtonElement.text()).toEqual(buttons.primary.label);
    expect(secondaryButtonElement.text()).toEqual(buttons.secondary.label);
  });

  describe('can be closed', () => {
    beforeEach(() => {
      closed.mockReset();
    });

    it('by clicking the X button', () => {
      component.header.closeButtonElement.simulate('click');
      expect(closed).toHaveBeenCalledTimes(1);
    });

    it('by pressing the ESC key', () => {
      triggerKeyOn(component.dialogElement, 'Escape');
      expect(closed).toHaveBeenCalledTimes(1);
    });
  });

  it('can trigger an event when clicking its primary button', () => {
    component.footer.primaryButtonElement.simulate('click');
    expect(clickedPrimary).toHaveBeenCalledTimes(1);
  });

  it('can trigger an event when clicking its secondary button', () => {
    component.footer.secondaryButtonElement.simulate('click');
    expect(clickedSecondary).toHaveBeenCalledTimes(1);
  });

  it('can render with just a primary button', () => {
    const {footer} = mockDialog({
      title: 'Hello, user',
      closable: true,
      icon: Icons.Check,
      buttons: {
        primary: {
          label: 'Hello!',
          onClick: clickedPrimary
        }
      },
      onClose: closed
    });
    expect(footer.secondaryButtonElement.exists()).toEqual(false);
  });

  it('can hide the Close button', () => {
    const {header} = mockDialog({...defaultConfiguration, closable: false});
    expect(header.closeButtonElement.exists()).toEqual(false);
  });

  it('can avoid rendering the title container when there is no title', () => {
    const {header} = mockDialog({
      closable: true,
      icon: Icons.Check,
      onClose: closed
    });
    expect(header.title.element.exists()).toEqual(false);
  });

  it('can avoid rendering the footer when there are no buttons', () => {
    const {footer} = mockDialog({
      title: 'Hello, user',
      closable: true,
      icon: Icons.Check,
      onClose: closed
    });
    expect(footer.element.exists()).toEqual(false);
  });

  it('can avoid rendering the content section when there are no children', () => {
    const {contentElement} = mockDialog(
      {
        title: 'Hello, user',
        closable: true,
        icon: Icons.Check,
        onClose: closed
      },
      true
    );
    expect(contentElement.exists()).toEqual(false);
  });
});
