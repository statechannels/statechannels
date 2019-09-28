import React from "react";
import { FormButton } from "../../form";
import "./ShareFile.scss";

export type ShareFileProps = { file: any; goTo: (name: string) => void };

const ShareFile: React.FC<ShareFileProps> = ({ file, goTo }: ShareFileProps) => {
  return (
    <tr className={"share-file"}>
      <td className="name-cell">{file.filename}</td>
      <td className="other-cell">{file.size}Mb</td>
      <td className="other-cell">{file.seeders}S</td>
      <td className="other-cell">{file.peers}P</td>
      <td className="other-cell">${file.cost}</td>
      <td className="button-cell">
        <FormButton name="download" onClick={() => goTo(file.filename)}>
          Download
        </FormButton>
      </td>
    </tr>
  );
};

export { ShareFile };
