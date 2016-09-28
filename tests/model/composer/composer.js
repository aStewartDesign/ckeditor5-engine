/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: model, composer */

import Document from '/ckeditor5/engine/model/document.js';
import Composer from '/ckeditor5/engine/model/composer/composer.js';
import { setData, getData } from '/ckeditor5/engine/dev-utils/model.js';

describe( 'Composer', () => {
	let document, composer;

	beforeEach( () => {
		document = new Document();
		document.schema.registerItem( 'p', '$block' );
		document.createRoot();

		composer = new Composer();
	} );

	describe( 'constructor', () => {
		it( 'attaches deleteContents default listener', () => {
			setData( document, '<p>f[oo</p><p>ba]r</p>' );

			const batch = document.batch();

			composer.fire( 'deleteContents', { batch, selection: document.selection } );

			expect( getData( document ) ).to.equal( '<p>f[]</p><p>r</p>' );
			expect( batch.deltas ).to.not.be.empty;
		} );

		it( 'attaches deleteContents default listener which passes options', () => {
			setData( document, '<p>f[oo</p><p>ba]r</p>' );

			const batch = document.batch();

			composer.fire( 'deleteContents', {
				batch,
				selection: document.selection,
				options: { merge: true }
			} );

			expect( getData( document ) ).to.equal( '<p>f[]r</p>' );
		} );

		it( 'attaches modifySelection default listener', () => {
			setData( document, '<p>foo[]bar</p>' );

			composer.fire( 'modifySelection', {
				selection: document.selection,
				options: {
					direction: 'backward'
				}
			} );

			expect( getData( document ) )
				.to.equal( '<p>fo[o]bar</p>' );
			expect( document.selection.isBackward ).to.true;
		} );
	} );

	describe( 'deleteContents', () => {
		it( 'fires deleteContents event', () => {
			const spy = sinon.spy();
			const batch = document.batch();

			composer.on( 'deleteContents', spy );

			composer.deleteContents( batch, document.selection );

			const data = spy.args[ 0 ][ 1 ];

			expect( data.batch ).to.equal( batch );
			expect( data.selection ).to.equal( document.selection );
		} );
	} );

	describe( 'modifySelection', () => {
		it( 'fires deleteContents event', () => {
			const spy = sinon.spy();
			const opts = { direction: 'backward' };

			composer.on( 'modifySelection', spy );

			composer.modifySelection( document.selection, opts );

			const data = spy.args[ 0 ][ 1 ];

			expect( data.selection ).to.equal( document.selection );
			expect( data.options ).to.equal( opts );
		} );
	} );
} );
