import React from "react";
import { FormButton } from "../../form";
import "./ShareFile.scss";

export type ShareFileProps = { file: any };

const ShareFile: React.FC<ShareFileProps> = ({ file }: ShareFileProps) => {
  return (
    <tr className={"share-file"}>
      <td className="name-cell">{file.filename}</td>
      <td className="other-cell">{file.size}Mb</td>
      <td className="other-cell">{file.seeders}S</td>
      <td className="other-cell">{file.peers}P</td>
      <td className="other-cell">${file.cost}</td>
      <td className="button-cell">
        <FormButton name="download" onClick={() => null}>
          Download
        </FormButton>
      </td>
    </tr>
  );
};

export { ShareFile };
