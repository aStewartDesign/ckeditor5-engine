/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import Range from './range.js';
import EmitterMixin from '../../utils/emittermixin.js';
import utils from '../../utils/utils.js';

/**
 * LiveRange is a Range in the Tree Model that updates itself as the tree changes. It may be used as a bookmark.
 *
 * **Note:** Be very careful when dealing with `LiveRange`. Each `LiveRange` instance bind events that might
 * have to be unbound. Use {@link engine.treeModel.LiveRange#detach detach} whenever you don't need `LiveRange` anymore.
 *
 * @memberOf engine.treeModel
 */
export default class LiveRange extends Range {
	/**
	 * Creates a live range.
	 *
	 * @see engine.treeModel.Range
	 */
	constructor( start, end ) {
		super( start, end );

		bindWithDocument.call( this );
	}

	/**
	 * Unbinds all events previously bound by LiveRange. Use it whenever you don't need LiveRange instance
	 * anymore (i.e. when leaving scope in which it was declared or before re-assigning variable that was
	 * referring to it).
	 */
	detach() {
		this.stopListening();
	}

	/**
	 * @see engine.treeModel.Range.createFromElement
	 * @static
	 * @method engine.treeModel.LiveRange.createFromElement
	 * @param {engine.treeModel.Element} element
	 * @returns {engine.treeModel.LiveRange}
	 */

	/**
	 * @see engine.treeModel.Range.createFromPositionAndShift
	 * @static
	 * @method engine.treeModel.LiveRange.createFromPositionAndShift
	 * @param {engine.treeModel.Position} position
	 * @param {Number} shift
	 * @returns {engine.treeModel.LiveRange}
	 */

	/**
	 * @see engine.treeModel.Range.createFromParentsAndOffsets
	 * @static
	 * @method engine.treeModel.LiveRange.createFromParentsAndOffsets
	 * @param {engine.treeModel.Element} startElement
	 * @param {Number} startOffset
	 * @param {engine.treeModel.Element} endElement
	 * @param {Number} endOffset
	 * @returns {engine.treeModel.LiveRange}
	 */

	/**
	 * @see engine.treeModel.Range.createFromRange
	 * @static
	 * @method engine.treeModel.LiveRange.createFromRange
	 * @param {engine.treeModel.Range} range
	 * @returns {engine.treeModel.LiveRange}
	 */
}

/**
 * Binds this LiveRange to the {@link engine.treeModel.Document} that owns this range.
 *
 * @ignore
 * @private
 * @method engine.treeModel.LiveRange#bindWithDocument
 */
function bindWithDocument() {
	/*jshint validthis: true */

	this.listenTo(
		this.root.document,
		'change',
		( event, type, changes ) => {
			fixBoundaries.call( this, type, changes.range, changes.sourcePosition );
		},
		this
	);
}

/**
 * LiveRange boundaries are instances of {@link engine.treeModel.LivePosition}, so it is updated thanks to them. This method
 * additionally fixes the results of updating live positions taking into account that those live positions
 * are boundaries of a range. An example case for fixing live positions is end boundary is moved before start boundary.
 *
 * @ignore
 * @private
 * @method fixBoundaries
 * @param {String} type Type of changes applied to the Tree Model.
 * @param {engine.treeModel.Range} range Range containing the result of applied change.
 * @param {engine.treeModel.Position} [position] Additional position parameter provided by some change events.
 */
function fixBoundaries( type, range, position ) {
	/* jshint validthis: true */
	let updated;
	const howMany = range.end.offset - range.start.offset;

	switch ( type ) {
		case 'insert':
			updated = this.getTransformedByInsertion( range.start, howMany )[ 0 ];
			break;

		case 'move':
		case 'remove':
		case 'reinsert':
			const result = this.getTransformedByMove( position, range.start, howMany );

			// First item in the array is the "difference" part, so a part of the range
			// that did not get moved. We use it as reference range and expand if possible.
			updated = result[ 0 ];

			// We will check if there is other range and if it is touching the reference range.
			// If it does, we will expand the reference range (at the beginning or at the end).
			// Keep in mind that without settings `spread` flag, `getTransformedByMove` may
			// return maximum two ranges.
			if ( result.length > 1 ) {
				let otherRange = result[ 1 ];

				if ( updated.start.isTouching( otherRange.end ) ) {
					updated.start = otherRange.start;
				} else if ( updated.end.isTouching( otherRange.start ) ) {
					updated.end = otherRange.end;
				}
			}

			break;
	}

	if ( updated ) {
		this.start = updated.start;
		this.end = updated.end;
	}
}

utils.mix( LiveRange, EmitterMixin );
