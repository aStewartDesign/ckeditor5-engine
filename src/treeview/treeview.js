/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import EmitterMixin from '../emittermixin.js';
import Renderer from './renderer.js';
import Converter from './converter.js';

import objectUtils from '../lib/lodash/object.js';

/**
 * TreeView class combines the actual tree of view elements, tree of DOM elements, {@link treeView.Converter converter},
 * {@link treeView.Renderer renderer} and all {@link treeView.Observer observers}. It creates an abstract layer over the
 * content editable area. If you want to simple transform the tree of view elements to the DOM elements you can use
 * {@link treeView.Converter}.
 *
 * @mixins EmitterMixin
 *
 * @class treeView.TreeView
 */
export default class TreeView {
	/**
	 * Creates a TreeView based on the HTMLElement. The constructor copy the element name and attributes to create the
	 * root of the view, but does not copy children, what means the whole content of this root element will be removed
	 * when you call {@link treeView.TreeView#render}.
	 *
	 * @param {HTMLElement} domRoot DOM element in which the tree view should do change.
	 * @constructor
	 */
	constructor( domRoot ) {
		/**
		 * Root of the DOM tree.
		 *
		 * @type {HTMLElement}
		 */
		this.domRoot = domRoot;

		/**
		 * Set of {@link treeView.Observer observers}.
		 *
		 * @type {Set.<treeView.Observer>}
		 */
		this.observers = new Set();

		/**
		 * Instance of the {@link treeView.Converter converter} use by {@link treeView.TreeView#renderer renderer} and
		 * {@link treeView.TreeView#observers observers}.
		 *
		 * @type {treeView.Converter}
		 */
		this.converter = new Converter();

		/**
		 * Root of the view tree.
		 *
		 * @type {treeView.Element}
		 */
		this.viewRoot = this.converter.domToView( domRoot , { bind: true, withChildren: false } );
		this.viewRoot.setTreeView( this );

		/**
		 * Instance of the {@link treeView.TreeView#renderer renderer}.
		 *
		 * @type {treeView.Renderer}
		 */
		this.renderer = new Renderer( this.converter );
		this.renderer.markToSync( 'CHILDREN', this.viewRoot );

		// Mark changed nodes in the renderer.
		this.viewRoot.on( 'change', ( evt, type, node ) => {
			this.renderer.markToSync( type, node );
		} );
	}

	/**
	 * Add an observer to the set of the observers. This method also {@link treeView.Observer#init initialize} and
	 * {@link treeView.Observer#attach attach} the observer.
	 *
	 * @param {treeView.Observer} observer Observer to add.
	 */
	addObserver( observer ) {
		this.observers.add( observer );
		observer.init( this );
		observer.attach();
	}

	/**
	 * Detach all observers, render changes and reattach observers.
	 */
	render() {
		for ( let observer of this.observers ) {
			observer.detach();
		}

		this.renderer.render();

		for ( let observer of this.observers ) {
			observer.attach();
		}
	}
}

objectUtils.extend( TreeView.prototype, EmitterMixin );

/**
 * Enum representing type of the change.
 * Possible values:
 *
 *	* `CHILDREN` - for child list changes,
 *	* `ATTRIBUTES` - for element attributes changes,
 *	* `TEXT` - for text nodes changes.
 *
 * @typedef {String} treeView.ChangeType
 */
