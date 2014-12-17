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
Scenario: Open up a deal

  Given I do something
  When Something happens
  Then I check that it is what I have expected
