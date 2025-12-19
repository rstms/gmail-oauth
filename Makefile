
# gmail authorization makefile

project != basename $$(pwd)
gitclean = if git status --porcelain | grep '^.*$$'; then echo git status is dirty; false; else echo git status is clean; true; fi

src = $(filter-out eslint.config.js,$(wildcard *.js))
json != find -type f -name \*.json
json_fmt = $(foreach foo,$(json),$(dir $(foo)).$(notdir $(basename $(foo))))

html = $(wildcard *.html)

package_files = $(src) $(html) assets

version != cat VERSION

all: $(html) $(src) $(json_fmt) fix .fmt lint assets
	touch manifest.json

.manifest: manifest.json
	jq . <$< >$<.parsed && mv $<.parsed $<
	touch $@

assets: exported/assets
	rm -rf assets
	mkdir assets
	$(foreach asset,$(wildcard exported/assets/*),mv $(asset) assets;)

%.html: exported/%.html
	sed '/<script>/,/<\/script>/d' $< >$@

fix: .fix

.fix: $(src)
	fix eslint fix *.js

lint: eslint.config.js
	eslint *.js

eslint.config.js:
	eslint config >$@

fmt:	.fmt

.fmt: fix $(html)
	prettier --tab-width 4 --print-width 135 --write "*.js" "*.html"
	touch $@

release_file = $(project)-$(version).tgz

dist/$(release_file): $(package_files)
	tar zcvf dist/$(release_file) $(package_files)

dist: dist/$(release_file)

release: all dist
	@$(gitclean)
	gh release create v$(version) --notes "v$(version)"
	( cd dist && gh release upload v$(version) $(release_file) )

clean:
	rm -f .eslint
	docker rmi eslint || true
	rm -f .prettier
	docker rmi prettier || true
	rm -rf src/node_modules

distclean: clean
	rm -rf dist && mkdir dist

deploy:
	@$(gitclean)
	ssh capsule update-gmail-oauth
