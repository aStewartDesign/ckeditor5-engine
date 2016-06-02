/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import MoveOperation from './moveoperation.js';
import Position from '../position.js';
import ReinsertOperation from './reinsertoperation.js';

/**
 * Operation to remove a range of nodes.
 *
 * @memberOf engine.model.operation
 * @extends engine.model.operation.Operation
 */
export default class RemoveOperation extends MoveOperation {
	/**
	 *
	 * Creates a remove operation.
	 *
	 * @param {engine.model.Position} position Position before the first node to remove.
	 * @param {Number} howMany How many nodes to remove.
	 * @param {Number} baseVersion {@link engine.model.Document#version} on which operation can be applied.
	 */
	constructor( position, howMany, baseVersion ) {
		// Position in a graveyard where nodes were moved.
		const graveyardPosition = Position.createFromParentAndOffset( position.root.document.graveyard, 0 );

		super( position, howMany, graveyardPosition, baseVersion );
	}

	get type() {
		return 'remove';
	}

	/**
	 * @returns {engine.model.operation.ReinsertOperation}
	 */
	getReversed() {
		return new ReinsertOperation( this.targetPosition, this.howMany, this.sourcePosition, this.baseVersion + 1 );
	}

	/**
	 * @returns {engine.model.operation.RemoveOperation}
	 */
	clone() {
		return new RemoveOperation( this.sourcePosition, this.howMany, this.baseVersion );
	}

	/**
	 * @inheritDoc
	 */
	static get className() {
		return 'engine.model.operation.RemoveOperation';
	}
}