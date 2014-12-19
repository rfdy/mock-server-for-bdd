@test
Feature: Initial BDDs
  In order to add features without breaking things
  As a developer
  I need to set up BDDs

  Background: setup mocks

    Given I enable "wikipedia.org" mockfile "wikipedia.org/search-for-cplusplus.txt"
    And I enable "wikipedia.org" mockfile "wikipedia.org/search-for-javascript.txt"
    And I enable "wikipedia.org" mockserver

@test
Scenario: Try calling the API

  Given Everything is setup
  When I go to the "w/api.php?format=json&action=query&titles=javascript&prop=revisions&rvprop=content&continue"
  Then I expect to get http code "200"
  And I expect the response to contain "MOCK"

  Given Everything is setup
  When I go to the "w/api.php?format=json&action=query&titles=ruby&prop=revisions&rvprop=content&continue"
  Then I expect to get http code "200"
  And I expect the response to not contain "MOCK"
