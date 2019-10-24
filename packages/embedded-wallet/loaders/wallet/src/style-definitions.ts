export const EmbeddedWalletContainerStyles = `
      iframe#wallet {
        border: 0;
        position: absolute;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        width: 700px;
        height: 500px;
        top: 50%;
        margin-top: -250px;
        overflow: hidden;
        z-index: 1;
      }

      div#walletContainer {
        position: absolute;
        left: 0px;
        top: 0px;
        width: 100%;
        height: 100%;
        background: #000;
        opacity: 0.32;
        z-index: 0;
      }
      `;
