import React from "react";

import '../App.css';

export default function Header() {
	return (
		<div
			style={{
				width: "100%",
				height: 58,
				borderBottomStyle: "solid",
				borderBottomWidth: 1,
				borderBottomColor: "#bbb"
			}}
		>
			<div style={{ position: 'absolute', left: 20 }}>
				<a href="/">
					<h3>RPS</h3>
				</a>
			</div>
			<div style={{ position: 'absolute', right: 20, top: 0 }}>
				<a style={{ display: 'inline-block', marginRight: 16 }} href="/">
					<h3>Home</h3>
				</a>
				<a style={{ display: 'inline-block' }} href="/about">
					<h3>About</h3>
				</a>
			</div>
		</div>
	);
}
