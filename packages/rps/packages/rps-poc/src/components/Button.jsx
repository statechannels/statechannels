import React from "react";

export default function Button({ children }) {
	return (
  	<button 
  		style={{ 
  			borderColor: '#aaa', 
  			borderStyle: 'solid', 
  			fontSize: 32, 
  			backgroundColor: '#fff',
		    padding: '3px 16px 4px',
		    borderRadius: 3,
  		}}
  	>
  		{children}
  	</button>
	);
}
